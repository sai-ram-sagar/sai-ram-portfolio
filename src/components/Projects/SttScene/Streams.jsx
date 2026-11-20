import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry } from "three";
import { hash } from "../sceneKit/math";
import { getGlowTexture } from "./textures";
import {
  AUDIO,
  DATA,
  HUB,
  LANE_Y,
  LANE_Z,
  PBX,
  TRANSLATIONS,
  WORDS,
  clamp01,
  lerp,
  levelAt,
  pusherPoint,
  smoothstep,
} from "./timeline";

/* Audio: a pool of particles, each re-emitted every PERIOD seconds, so audio
   leaves the PBX continuously for as long as the call lasts. */
const AUDIO_POOL = 180;
const AUDIO_PERIOD = AUDIO_POOL / AUDIO.rate;
const PARTICLE_SIZE = 0.1; /* world units */

/* 200 ms chunks: one cube per chunk, recycled */
const CHUNK_POOL = 16;

/* Transcript words and translation lines, recycled from small pools. */
const WORD_POOL = 12;
const TRANS_POOL = 4;
const TRAIL = 10;
const TRAIL_STEP = 0.04;

const [G1, G2, G3] = HUB.gates;
const RAW = [0.95, 0.6, 0.28]; /* telephony audio: warm and noisy */
const CLEAN = [0.24, 0.66, 1.0]; /* after the bridge: clean blue */
const CHUNK_FIRST_AGE = (G3 - PBX.out) / AUDIO.speed;

const makeBuffers = (count) => {
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(count * 3), 3);
  const color = new BufferAttribute(new Float32Array(count * 3), 3);
  geometry.setAttribute("position", position);
  geometry.setAttribute("color", color);
  /* particles roam the whole scene; a tight bound would cull them early */
  geometry.boundingSphere = null;
  return { geometry, position, color };
};

/* path of a transcript fragment: STT -> along the WebSocket -> bridge -> Pusher -> agent UI */
const dataPoint = (s, out) => {
  if (s <= DATA.wsLength) {
    out.x = DATA.fromX - s;
    out.y = LANE_Y + 0.02 * Math.sin(s * 9);
    out.z = LANE_Z.data;
    return out;
  }
  return pusherPoint(clamp01((s - DATA.wsLength) / (DATA.length - DATA.wsLength)), out);
};

/**
 * Everything that travels. Audio: raw, noisy telephony from the PBX is cleaned
 * and resampled by the bridge and leaves it as 200 ms chunks bound for the STT
 * server. Text: transcript words and translation lines run back along the same
 * WebSocket and out through Pusher to the agent's screen. Both are driven
 * straight from the clock, so they run at the same time for the whole call.
 */
export const Streams = ({ sim }) => {
  const audioMat = useRef();
  const dataMat = useRef();
  const chunks = useRef([]);
  const words = useRef([]);
  const lines = useRef([]);
  const glowMap = getGlowTexture();

  const audio = useMemo(() => makeBuffers(AUDIO_POOL), []);
  const data = useMemo(() => makeBuffers((WORD_POOL + TRANS_POOL) * TRAIL), []);
  const scratch = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);

  /* each particle's slot inside the emission period, lightly jittered */
  const offsets = useMemo(
    () =>
      Float32Array.from(
        { length: AUDIO_POOL },
        (_, j) => (j / AUDIO_POOL) * AUDIO_PERIOD + hash(j) * 0.2 * (AUDIO_PERIOD / AUDIO_POOL)
      ),
    []
  );

  useEffect(
    () => () => {
      audio.geometry.dispose();
      data.geometry.dispose();
    },
    [audio, data]
  );

  /* one transcript fragment (word or translation line): chip + comet trail */
  const placeFragment = (item, index, pool, chipRefs, trailBase, color, length, t, dp, dc, used) => {
    const age = t - item.emit;
    if (age < 0 || age > DATA.travel) return;
    const slot = index % pool;
    used.add(slot);
    const s = age * DATA.speed;
    const chip = chipRefs.current[slot];

    dataPoint(s, scratch);
    if (chip) {
      chip.visible = true;
      chip.position.set(scratch.x, scratch.y, scratch.z);
      const size = smoothstep(0, 0.25, s) * (1 - smoothstep(DATA.length - 0.3, DATA.length, s));
      const k = Math.max(size, 0.001);
      chip.scale.set(k * length, k, k);
    }
    for (let j = 0; j < TRAIL; j += 1) {
      const o = (trailBase + slot * TRAIL + j) * 3;
      const tailAge = age - j * TRAIL_STEP;
      if (tailAge < 0) {
        dc[o] = dc[o + 1] = dc[o + 2] = 0;
        continue;
      }
      const ts = tailAge * DATA.speed;
      dataPoint(ts, scratch);
      dp[o] = scratch.x + hash(index * 31 + j) * 0.008;
      dp[o + 1] = scratch.y + hash(index * 31 + j + 7) * 0.016;
      dp[o + 2] = scratch.z + hash(index * 31 + j + 13) * 0.016;
      const fade = (1 - j / TRAIL) ** 1.5 * (1 - smoothstep(DATA.length - 0.5, DATA.length, ts)) * clamp01(ts * 4);
      dc[o] = color[0] * fade;
      dc[o + 1] = color[1] * fade;
      dc[o + 2] = color[2] * fade;
    }
  };

  const clearUnused = (pool, chipRefs, trailBase, used, dc) => {
    for (let slot = 0; slot < pool; slot += 1) {
      if (used.has(slot)) continue;
      if (chipRefs.current[slot]) chipRefs.current[slot].visible = false;
      for (let j = 0; j < TRAIL; j += 1) {
        const o = (trailBase + slot * TRAIL + j) * 3;
        dc[o] = dc[o + 1] = dc[o + 2] = 0;
      }
    }
  };

  useFrame((state) => {
    const { t } = sim.current;
    const px = state.camera.zoom * state.gl.getPixelRatio() * PARTICLE_SIZE;
    audioMat.current.size = px;
    dataMat.current.size = px * 1.3;

    /* ---- audio: PBX -> bridge -> STT, continuous ---- */
    const ap = audio.position.array;
    const ac = audio.color.array;
    for (let j = 0; j < AUDIO_POOL; j += 1) {
      const i = j * 3;
      /* the most recent emission of this particle */
      const emit = offsets[j] + Math.floor((t - offsets[j]) / AUDIO_PERIOD) * AUDIO_PERIOD;
      const age = t - emit;
      if (emit < AUDIO.start || emit > AUDIO.end || age < 0 || age > AUDIO.travel) {
        ac[i] = ac[i + 1] = ac[i + 2] = 0;
        continue;
      }
      const u = age * AUDIO.speed;
      const xNat = PBX.out + u;
      const amp = levelAt(emit);

      /* gate 1 - noise cancelling: the jitter and static die away */
      const noise = 1 - smoothstep(G1 - 0.3, G1 + 0.12, xNat);
      /* gate 2 - resampling: the waveform is redrawn at the model's rate (twice as fine) */
      const rate = 1 + smoothstep(G2 - 0.1, G2 + 0.2, xNat);
      /* gate 3 - chunking: particles gather into their 200 ms chunk and travel as one */
      const chunk = Math.floor(emit / AUDIO.chunk);
      const ec = (chunk + 0.5) * AUDIO.chunk;
      const xChunk = PBX.out + (t - ec) * AUDIO.speed + (emit - ec) * AUDIO.speed * 0.12;
      const pack = smoothstep(G3 - 0.1, G3 + 0.3, xNat);

      const taper =
        smoothstep(0.15, 0.8, u) * (1 - smoothstep(AUDIO.length - 0.9, AUDIO.length - 0.1, u)) * (1 - 0.8 * pack);
      ap[i] = lerp(xNat, xChunk, pack);
      ap[i + 1] =
        LANE_Y + amp * Math.sin(emit * 62 * rate) * 0.27 * taper + noise * hash(j + 9) * 0.1 + hash(j + 5) * 0.01;
      ap[i + 2] = LANE_Z.audio + hash(j + 3) * 0.026 + noise * hash(j + 17) * 0.08;

      const alpha = smoothstep(0, 0.25, u) * (1 - smoothstep(AUDIO.length - 0.35, AUDIO.length, u));
      const level = alpha * (0.55 + amp * 0.8) * (0.7 + 0.3 * (1 - noise));
      ac[i] = lerp(CLEAN[0], RAW[0], noise) * level;
      ac[i + 1] = lerp(CLEAN[1], RAW[1], noise) * level;
      ac[i + 2] = lerp(CLEAN[2], RAW[2], noise) * level;
    }
    audio.position.needsUpdate = true;
    audio.color.needsUpdate = true;

    /* ---- one cube per 200 ms chunk once it has left the bridge ---- */
    const firstChunk = Math.ceil((t - AUDIO.travel) / AUDIO.chunk - 0.5);
    const lastChunk = Math.floor((t - CHUNK_FIRST_AGE) / AUDIO.chunk - 0.5);
    const usedChunks = new Set();
    for (let c = firstChunk; c <= lastChunk; c += 1) {
      const ec = (c + 0.5) * AUDIO.chunk;
      if (ec < AUDIO.start || ec > AUDIO.end) continue;
      const slot = ((c % CHUNK_POOL) + CHUNK_POOL) % CHUNK_POOL;
      const mesh = chunks.current[slot];
      if (!mesh) continue;
      usedChunks.add(slot);
      const u = (t - ec) * AUDIO.speed;
      const x = PBX.out + u;
      const size = smoothstep(G3, G3 + 0.35, x) * (1 - smoothstep(AUDIO.length - 0.45, AUDIO.length - 0.05, u));
      mesh.visible = size > 0.01;
      mesh.position.set(x, LANE_Y, LANE_Z.audio);
      mesh.scale.setScalar(Math.max(size, 0.001));
    }
    for (let slot = 0; slot < CHUNK_POOL; slot += 1) {
      if (!usedChunks.has(slot) && chunks.current[slot]) chunks.current[slot].visible = false;
    }

    /* ---- transcript words and translation lines: STT -> bridge -> Pusher -> UI ---- */
    const dp = data.position.array;
    const dc = data.color.array;
    const usedWords = new Set();
    const usedLines = new Set();
    for (let w = 0; w < WORDS.length; w += 1) {
      const word = WORDS[w];
      placeFragment(word, w, WORD_POOL, words, 0, [0.45, 1.0, 0.78], 0.13 + word.text.length * 0.03, t, dp, dc, usedWords);
    }
    for (let n = 0; n < TRANSLATIONS.length; n += 1) {
      const line = TRANSLATIONS[n];
      placeFragment(line, n, TRANS_POOL, lines, WORD_POOL * TRAIL, [1.0, 0.8, 0.4], 0.5, t, dp, dc, usedLines);
    }
    clearUnused(WORD_POOL, words, 0, usedWords, dc);
    clearUnused(TRANS_POOL, lines, WORD_POOL * TRAIL, usedLines, dc);
    data.position.needsUpdate = true;
    data.color.needsUpdate = true;
  });

  return (
    <group>
      <points geometry={audio.geometry} frustumCulled={false}>
        <pointsMaterial
          ref={audioMat}
          map={glowMap}
          vertexColors
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
          sizeAttenuation={false}
        />
      </points>
      <points geometry={data.geometry} frustumCulled={false}>
        <pointsMaterial
          ref={dataMat}
          map={glowMap}
          vertexColors
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
          sizeAttenuation={false}
        />
      </points>

      {Array.from({ length: CHUNK_POOL }, (_, slot) => (
        <mesh
          key={`c${slot}`}
          ref={(node) => {
            chunks.current[slot] = node;
          }}
          visible={false}
        >
          <boxGeometry args={[0.15, 0.12, 0.12]} />
          <meshStandardMaterial color="#cfe6ff" emissive="#4aa8ff" emissiveIntensity={2.2} roughness={0.35} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: WORD_POOL }, (_, slot) => (
        <mesh
          key={`w${slot}`}
          ref={(node) => {
            words.current[slot] = node;
          }}
          visible={false}
        >
          <boxGeometry args={[1, 0.11, 0.1]} />
          <meshStandardMaterial color="#eafff6" emissive="#6dffc4" emissiveIntensity={2.4} roughness={0.3} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: TRANS_POOL }, (_, slot) => (
        <mesh
          key={`t${slot}`}
          ref={(node) => {
            lines.current[slot] = node;
          }}
          visible={false}
        >
          <boxGeometry args={[1, 0.14, 0.12]} />
          <meshStandardMaterial color="#fff2cf" emissive="#ffc24d" emissiveIntensity={2.4} roughness={0.3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};
