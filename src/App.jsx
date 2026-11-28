import styles from "./App.module.css";
import { Background } from "./components/Background/Background";
import { Navbar } from "./components/Navbar/Navbar";
import { Hero } from "./components/Hero/Hero";
import { About } from "./components/About/About";
import { Experience } from "./components/Experience/Experience";
import { Projects } from "./components/Projects/Projects";
import { Skills } from "./components/Skills/Skills";
import { Education } from "./components/Education/Education";
import { Contact } from "./components/Contact/Contact";
import { Footer } from "./components/Footer/Footer";
import { SpiderDecor } from "./components/ui/SpiderDecor";
import { BatDecor } from "./components/ui/BatDecor";
import { BatPeek } from "./components/ui/BatPeek";
import { SpiderPeek } from "./components/ui/SpiderPeek";
import { NameIntro } from "./components/ui/NameIntro";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { usePageScroll } from "./hooks/usePageScroll";

function App() {
  usePageScroll();
  useScrollReveal();

  return (
    <div className={styles.app}>
      <a className="skipLink" href="#about">
        Skip to content
      </a>
      <Background />
      <SpiderDecor />
      <BatDecor />
      <BatPeek />
      <SpiderPeek />
      <NameIntro />
      <Navbar />
      <main className={styles.main}>
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Skills />
        <Education />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;
