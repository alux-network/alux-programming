// The entrance (/magic/<lang>/): localized welcome narration, the edition picker and the choice
// between worlds, in the approved gateway markup that reader.css styles. While it is shown,
// <html data-gateway> is set. The narration never starts by itself: only its button plays it, and
// leaving the entrance stops it.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { chooseEntranceLanguage } from '../entrance.ts';
import { languages, readerName } from '../languages.ts';
import type { Language } from '../languages.ts';
import { isLanguage, loadPrefs, realUrl, savePrefs } from './prefs.ts';
import { t } from './t.ts';

/** Sets the document's language, direction and title for an edition. */
export function useEdition(lang: Language) {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = languages.some((l) => l.code === lang && 'rtl' in l && l.rtl) ? 'rtl' : 'ltr';
    document.title = readerName(lang);
  }, [lang]);
}

/** Redirects /magic/ to the entrance of the visitor's edition: saved choice, country, browser. */
export function ChooseEdition() {
  const navigate = useNavigate();
  useEffect(() => {
    let live = true;
    void chooseEntranceLanguage(loadPrefs().language).then((lang) => { if (live) navigate(`/${lang}/`, { replace: true }); });
    return () => { live = false; };
  }, [navigate]);
  return null;
}

/** The entrance of one edition. */
export function Entrance() {
  const { lang } = useParams();
  return isLanguage(lang) ? <Gateway lang={lang} /> : <Navigate to="/" replace />;
}

function Gateway({ lang }: { lang: Language }) {
  const navigate = useNavigate();
  const welcome = useRef<HTMLAudioElement>(null);
  useEdition(lang);
  // Before paint: reader.css shows the gateway only under html[data-gateway].
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.dataset.gateway = '';
    const audio = welcome.current!;
    return () => { delete html.dataset.gateway; audio.pause(); };
  }, [lang]);

  const choose = (world: 'magic' | 'real') => {
    const prefs = loadPrefs();
    prefs.world = world;
    // The music controller owns its default; choosing a world preserves the reader's preference.
    savePrefs(prefs);
    if (world === 'magic') navigate(`/${lang}/index.html`);
    else location.assign(realUrl(lang));
  };
  const pick = (code: Language) => {
    const prefs = loadPrefs();
    prefs.language = code;
    savePrefs(prefs);
    navigate(`/${code}/`);
  };

  return (
    <section id="gateway" className="gateway" aria-label={t(lang, 'Choose your world')}>
      <button id="welcome-play" className="gateway-welcome" type="button"
        onClick={() => { if (welcome.current!.paused) welcome.current!.play().catch(() => {}); }}>
        <i className="fa fa-play" aria-hidden="true"></i> <span>{t(lang, 'Listen to the welcome')}</span>
      </button>
      <label className="language">
        <i className="fa fa-globe" aria-hidden="true"></i>
        <select className="language-picker" title={t(lang, 'Language')} aria-label={t(lang, 'Language')} value={lang}
          onChange={(e) => pick(e.target.value as Language)}>
          {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </label>
      <button className="world-choice magic" type="button" data-world="magic" onClick={() => choose('magic')}>
        <i className="fa fa-magic" aria-hidden="true"></i>
        <strong>{t(lang, 'Magic world')}</strong>
        <span className="world-enter"><span>{t(lang, 'Click to enter')}</span> ↗</span>
      </button>
      <img className="gateway-wizard" src="/wizard-standing.webp" alt="" />
      <button className="world-choice real" type="button" data-world="real" onClick={() => choose('real')}>
        <i className="fa fa-code" aria-hidden="true"></i>
        <strong>{t(lang, 'Real world')}</strong>
        <span className="world-enter"><span>{t(lang, 'Click to enter')}</span> ↗</span>
      </button>
      <audio id="welcome-audio" ref={welcome} src={`/audio/welcome/${lang}.mp3`} preload="none"></audio>
    </section>
  );
}
