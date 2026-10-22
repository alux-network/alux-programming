import {language} from './i18n.js';
import './reader-music.css';

const copy={
  en:{music:'Reading music',on:'Play music',off:'Pause music',volume:'Volume',close:'Close',promptTitle:'A little music for this world?',promptBody:'Let the forest breathe softly in the background while you read.',withMusic:'Read with music',withoutMusic:'Read without music',unavailable:'Music could not start. Try again from the music button.'},
  zh:{music:'阅读音乐',on:'播放音乐',off:'暂停音乐',volume:'音量',close:'关闭',promptTitle:'为这个世界添一点音乐？',promptBody:'让森林的呼吸轻轻陪伴你的阅读。',withMusic:'伴随音乐阅读',withoutMusic:'不播放音乐',unavailable:'音乐暂时无法播放，请点音乐按钮重试。'},
  'zh-hant':{music:'閱讀音樂',on:'播放音樂',off:'暫停音樂',volume:'音量',close:'關閉',promptTitle:'為這個世界添一點音樂？',promptBody:'讓森林的呼吸輕輕陪伴你的閱讀。',withMusic:'伴隨音樂閱讀',withoutMusic:'不播放音樂',unavailable:'音樂暫時無法播放，請點音樂按鈕重試。'},
  ja:{music:'読書の音楽',on:'音楽を再生',off:'音楽を一時停止',volume:'音量',close:'閉じる',promptTitle:'この世界に音楽を添えますか？',promptBody:'森の息吹を背景に、ゆっくり読書をお楽しみください。',withMusic:'音楽と読む',withoutMusic:'音楽なしで読む',unavailable:'音楽を再生できません。音楽ボタンから再試行してください。'},
  ko:{music:'읽기 음악',on:'음악 재생',off:'음악 일시 정지',volume:'음량',close:'닫기',promptTitle:'이 세계에 음악을 더할까요?',promptBody:'숲의 숨결을 배경으로 편안하게 읽어 보세요.',withMusic:'음악과 함께 읽기',withoutMusic:'음악 없이 읽기',unavailable:'음악을 재생할 수 없습니다. 음악 버튼을 눌러 다시 시도하세요.'},
  ar:{music:'موسيقى القراءة',on:'تشغيل الموسيقى',off:'إيقاف الموسيقى مؤقتًا',volume:'مستوى الصوت',close:'إغلاق',promptTitle:'هل ترغب في موسيقى لهذا العالم؟',promptBody:'دع أنفاس الغابة ترافق قراءتك بهدوء.',withMusic:'القراءة مع الموسيقى',withoutMusic:'القراءة دون موسيقى',unavailable:'تعذر تشغيل الموسيقى. حاول مجددًا من زر الموسيقى.'},
  de:{music:'Lesemusik',on:'Musik abspielen',off:'Musik pausieren',volume:'Lautstärke',close:'Schließen',promptTitle:'Ein wenig Musik für diese Welt?',promptBody:'Lass den Atem des Waldes deine Lektüre sanft begleiten.',withMusic:'Mit Musik lesen',withoutMusic:'Ohne Musik lesen',unavailable:'Die Musik konnte nicht starten. Versuche es über die Musiktaste erneut.'},
  es:{music:'Música para leer',on:'Reproducir música',off:'Pausar música',volume:'Volumen',close:'Cerrar',promptTitle:'¿Un poco de música para este mundo?',promptBody:'Deja que el aliento del bosque acompañe tu lectura.',withMusic:'Leer con música',withoutMusic:'Leer sin música',unavailable:'No se pudo iniciar la música. Vuelve a intentarlo desde el botón.'},
  vi:{music:'Nhạc đọc sách',on:'Phát nhạc',off:'Tạm dừng nhạc',volume:'Âm lượng',close:'Đóng',promptTitle:'Thêm chút nhạc cho thế giới này nhé?',promptBody:'Để hơi thở khu rừng dịu dàng đồng hành cùng bạn đọc.',withMusic:'Đọc cùng âm nhạc',withoutMusic:'Đọc không nhạc',unavailable:'Không thể phát nhạc. Hãy thử lại bằng nút âm nhạc.'},
  ru:{music:'Музыка для чтения',on:'Включить музыку',off:'Приостановить музыку',volume:'Громкость',close:'Закрыть',promptTitle:'Добавить немного музыки в этот мир?',promptBody:'Пусть дыхание леса мягко сопровождает чтение.',withMusic:'Читать с музыкой',withoutMusic:'Читать без музыки',unavailable:'Не удалось запустить музыку. Попробуйте снова кнопкой музыки.'},
  uk:{music:'Музика для читання',on:'Увімкнути музику',off:'Призупинити музику',volume:'Гучність',close:'Закрити',promptTitle:'Додати трохи музики до цього світу?',promptBody:'Нехай подих лісу тихо супроводжує читання.',withMusic:'Читати з музикою',withoutMusic:'Читати без музики',unavailable:'Не вдалося запустити музику. Спробуйте ще раз кнопкою музики.'}
};
const storage={get(key){try{return localStorage.getItem(key)}catch{return null}},set(key,value){try{localStorage.setItem(key,value)}catch{}}};
const validRealm=realm=>realm==='magic'||realm==='real';
let audio,context,gain,source,button,popover,dialog,dock,lastTrigger=null,activeRealm=null,temporaryOff=false,contextCreatedAt=0,contextEverRunning=false;
const musicEnabled={magic:true,real:false};

function strings(){return copy[language()]||copy.en}
function base(){return import.meta.env.BASE_URL||'/'}
function bindAudio(){
  audio=document.createElement('audio');audio.loop=true;audio.preload='none';audio.src=new URL(`${base()}audio/forest-breath.mp3`,location.href).href;audio.setAttribute('aria-hidden','true');audio.tabIndex=-1;
  audio.addEventListener('error',()=>{audio.dataset.failed='true';const message=popover?.querySelector('.reader-music-error');if(message)message.hidden=false;});
  audio.addEventListener('playing',()=>{delete audio.dataset.failed;const message=popover?.querySelector('.reader-music-error');if(message)message.hidden=true;});
  document.body.append(audio);
}
function makeAudio(){
  if(audio)return;
  bindAudio();
}
function getGain(rebuild=false){
  if(context&&context.state!=='closed'&&!rebuild)return;
  if(rebuild&&context){const position=audio?.currentTime||0;try{source?.disconnect();context.close()}catch{}audio?.remove();bindAudio();try{audio.currentTime=position}catch{}context=null;source=null;gain=null;}
  const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
  try{if('audioSession'in navigator)navigator.audioSession.type='playback';}catch{}
  context=new Ctx();contextCreatedAt=Date.now();contextEverRunning=false;gain=context.createGain();gain.gain.value=Number(storage.get('alux-reader-music-volume')??0.28);gain.connect(context.destination);source=context.createMediaElementSource(audio);source.connect(gain);
  context.addEventListener('statechange',()=>{if(context?.state==='running'){contextEverRunning=true;if(activeRealm&&!dialog?.open&&!temporaryOff&&desired(activeRealm))audio.play().catch(()=>{});}});
}
function desired(realm){return Boolean(musicEnabled[realm])}
function setDesired(realm,value){musicEnabled[realm]=value}
function persistVolume(value){storage.set('alux-reader-music-volume',String(value));if(gain)gain.gain.setTargetAtTime(Number(value),context.currentTime,.025)}
function status(){return Boolean(audio&&!audio.paused&&!audio.ended)}
function syncControls(){
  if(!button)return;const s=strings(),playing=status();button.setAttribute('aria-label',s.music);button.setAttribute('aria-expanded',String(popover?.hidden===false));button.classList.toggle('is-playing',playing);button.innerHTML=`<span aria-hidden="true">${playing?'♫':'♪'}</span>`;
  if(popover){const toggle=popover.querySelector('[data-music-toggle]');toggle.textContent=playing?s.off:s.on;toggle.setAttribute('aria-pressed',String(playing));popover.querySelector('[data-music-title]').textContent=s.music;popover.querySelector('[data-music-volume-label]').textContent=s.volume;popover.querySelector('[data-music-close]').textContent=s.close;popover.querySelector('[data-music-close]').setAttribute('aria-label',s.close);popover.querySelector('.reader-music-error').textContent=s.unavailable;}
  if(dialog){dialog.querySelector('.reader-music-eyebrow').textContent=s.music;dialog.querySelector('h2').textContent=s.promptTitle;dialog.querySelector('form>p:not(.reader-music-eyebrow)').textContent=s.promptBody;dialog.querySelector('[data-music-with]').textContent=s.withMusic;dialog.querySelector('[data-music-without]').textContent=s.withoutMusic;}
}
function pause(){if(audio&&!audio.paused)audio.pause();syncControls()}
function playFromGesture(){
  if(!audio||!activeRealm||temporaryOff)return;
  audio.dataset.failed='';getGain();
  if(context?.state!=='running')context?.resume().catch(()=>{});
  audio.play().then(syncControls).catch(()=>{const message=popover?.querySelector('.reader-music-error');if(message)message.hidden=false;syncControls();});
}
function buildUI(){
  if(button)return;
  const s=strings();button=document.createElement('button');button.type='button';button.className='reader-music-button';button.setAttribute('aria-label',s.music);button.setAttribute('aria-haspopup','true');button.innerHTML='<span aria-hidden="true">♪</span>';
  popover=document.createElement('section');popover.className='reader-music-popover';popover.hidden=true;popover.setAttribute('aria-label',s.music);popover.innerHTML=`<div class="reader-music-heading"><span data-music-title>${s.music}</span><button type="button" data-music-close aria-label="${s.close}">${s.close}</button></div><button type="button" data-music-toggle aria-pressed="false"></button><label class="reader-music-volume"><span data-music-volume-label>${s.volume}</span><input data-music-volume type="range" min="0" max="1" step="0.01" value="${storage.get('alux-reader-music-volume')??'0.28'}"></label><p class="reader-music-error" role="status" hidden>${s.unavailable}</p>`;
  dock=document.createElement('div');dock.className='reader-music-dock';dock.append(button);document.body.append(dock,popover);
  dialog=document.createElement('dialog');dialog.className='reader-music-dialog';dialog.setAttribute('aria-labelledby','reader-music-title');dialog.setAttribute('aria-describedby','reader-music-description');dialog.innerHTML=`<form method="dialog"><p class="reader-music-eyebrow">${s.music}</p><h2 id="reader-music-title">${s.promptTitle}</h2><p id="reader-music-description">${s.promptBody}</p><div class="reader-music-actions"><button value="without" data-music-without>${s.withoutMusic}</button><button value="with" data-music-with>${s.withMusic}</button></div></form>`;document.body.append(dialog);
  button.addEventListener('click',()=>{const opening=popover.hidden;popover.hidden=!opening;syncControls();if(opening){positionPopover();popover.querySelector('[data-music-toggle]').focus();}});
  popover.querySelector('[data-music-close]').addEventListener('click',()=>{popover.hidden=true;button.focus();syncControls()});
  popover.querySelector('[data-music-toggle]').addEventListener('click',()=>{lastTrigger=popover.querySelector('[data-music-toggle]');const turnOn=!status();temporaryOff=false;setDesired(activeRealm,turnOn);if(turnOn)playFromGesture();else pause();popover.querySelector('.reader-music-error').hidden=true;syncControls()});
  popover.querySelector('[data-music-volume]').addEventListener('input',event=>persistVolume(event.target.value));
  dialog.querySelector('[data-music-with]').addEventListener('click',()=>{temporaryOff=false;setDesired(activeRealm,true);playFromGesture()});
  dialog.querySelector('[data-music-without]').addEventListener('click',()=>{temporaryOff=true;pause()});
  dialog.addEventListener('cancel',()=>{temporaryOff=true;pause()});
  dialog.addEventListener('close',()=>{if(lastTrigger?.isConnected)lastTrigger.focus();lastTrigger=null;syncControls()});
  document.addEventListener('click',event=>{const path=event.composedPath();if(!popover.hidden&&!path.includes(popover)&&!path.includes(button)){popover.hidden=true;syncControls()}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popover.hidden){event.preventDefault();popover.hidden=true;button.focus();syncControls();}});
  syncControls();
}
function positionPopover(){
 if(!button||!popover||popover.hidden)return;
 const rect=button.getBoundingClientRect(),width=Math.min(320,innerWidth-24),height=popover.getBoundingClientRect().height;
 popover.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right-width))+'px';
 popover.style.top=Math.max(12,Math.min(innerHeight-height-12,rect.bottom+8))+'px';
}
function showPrompt(realm){
  if(!dialog||!validRealm(realm))return;
  temporaryOff=false;lastTrigger=document.activeElement;
  if(dialog.open)dialog.close();
  try{dialog.showModal()}catch{dialog.setAttribute('open','');}
  dialog.dataset.defaultMusic=desired(realm)?'on':'off';
  dialog.querySelector(desired(realm)?'[data-music-with]':'[data-music-without]').focus();
}
export function syncReaderMusic(realm){
  const next=validRealm(realm)?realm:null;
  if(!next&&!dock)return;
  buildUI();makeAudio();
  if(next){const host=document.querySelector(next==='magic'?'.bound-tools':'.real-toolbar-left');host?.append(dock);}
  if(next===activeRealm){if(next&&desired(next)&&!temporaryOff&&audio.paused){}syncControls();return}
  activeRealm=next;temporaryOff=false;
  popover.hidden=true;
  if(!next){pause();if(dock)dock.hidden=true;if(dialog?.open)dialog.close();return}
  if(audio)audio.pause();
  setDesired(next,next==='magic');
  if(dock)dock.hidden=false;showPrompt(next);
  syncControls();
}
function onGesture(){
  if(!activeRealm||dialog?.open||!context||context.state==='running')return;
  if(contextEverRunning&&Date.now()-contextCreatedAt>1000){getGain(true);context?.resume().catch(()=>{});if(!temporaryOff&&desired(activeRealm))audio.play().then(syncControls).catch(()=>{});return}
  context.resume().then(()=>{if(activeRealm&&!temporaryOff&&desired(activeRealm))playFromGesture()}).catch(()=>{});
  if(context.state==='running'&&audio?.paused&&!temporaryOff&&desired(activeRealm))playFromGesture();
}
function onVisibility(){if(document.visibilityState==='hidden'){pause();return}if(dialog?.open)return;if(context&&context.state!=='running')context.resume().catch(()=>{});if(activeRealm&&!temporaryOff&&desired(activeRealm))audio.play().then(syncControls).catch(()=>{});}
for(const type of ['pointerdown','touchend','click','keydown'])document.addEventListener(type,onGesture,{capture:true,passive:true});
document.addEventListener('visibilitychange',onVisibility);
window.addEventListener('resize',positionPopover);window.addEventListener('scroll',positionPopover,{passive:true});
window.addEventListener('pagehide',pause);
export function disposeReaderMusic(){pause();if(dialog?.open)dialog.close();dock?.remove();popover?.remove();dialog?.remove();audio?.remove();try{context?.close()}catch{}audio=null;context=null;gain=null;source=null;button=null;popover=null;dialog=null;dock=null;activeRealm=null;}
