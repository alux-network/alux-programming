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

const hints={
 en:['Music is on. Click the note to pause.','Music is off. Click the note to play.'],zh:['音乐已开启，点击音符即可关闭。','音乐已关闭，点击音符即可开启。'],'zh-hant':['音樂已開啟，點擊音符即可關閉。','音樂已關閉，點擊音符即可開啟。'],ja:['音楽を再生中。音符を押すと停止します。','音楽は停止中。音符を押すと再生します。'],ko:['음악이 켜져 있습니다. 음표를 누르면 꺼집니다.','음악이 꺼져 있습니다. 음표를 누르면 켜집니다.'],vi:['Nhạc đang bật. Nhấn nốt nhạc để tắt.','Nhạc đang tắt. Nhấn nốt nhạc để bật.'],de:['Musik läuft. Zum Pausieren auf die Note klicken.','Musik ist aus. Zum Abspielen auf die Note klicken.'],es:['Música activada. Pulsa la nota para pausarla.','Música desactivada. Pulsa la nota para reproducirla.'],ru:['Музыка включена. Нажмите на ноту, чтобы выключить.','Музыка выключена. Нажмите на ноту, чтобы включить.'],uk:['Музику ввімкнено. Натисніть ноту, щоб вимкнути.','Музику вимкнено. Натисніть ноту, щоб увімкнути.'],ar:['الموسيقى تعمل. اضغط النوتة لإيقافها.','الموسيقى متوقفة. اضغط النوتة لتشغيلها.']
};
const storage={get(key){try{return localStorage.getItem(key)}catch{return null}},set(key,value){try{localStorage.setItem(key,value)}catch{}}};
const validRealm=realm=>realm==='magic'||realm==='real';
let audio,context,gain,source,button,popover,dock,hideTimer,activeRealm=null,contextCreatedAt=0,contextEverRunning=false;
const musicEnabled={magic:true,real:false};
const strings=()=>copy[language()]||copy.en;
const desired=()=>Boolean(musicEnabled[activeRealm]);
const volume=()=>{const n=Number(storage.get('alux-reader-music-volume')??1);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):1;};
function bindAudio(){
 audio=document.createElement('audio');audio.loop=true;audio.preload='none';audio.volume=1;audio.src=new URL((import.meta.env.BASE_URL||'/')+'audio/forest-breath.mp3',location.href).href;audio.setAttribute('aria-hidden','true');audio.tabIndex=-1;
 for(const event of ['playing','pause','ended'])audio.addEventListener(event,syncControls);
 audio.addEventListener('error',()=>{audio.dataset.failed='true';syncControls();});document.body.append(audio);
}
function getGain(rebuild=false){
 if(context&&context.state!=='closed'&&!rebuild)return;
 if(rebuild&&context){const position=audio?.currentTime||0;try{source?.disconnect();context.close()}catch{}audio?.remove();bindAudio();try{audio.currentTime=position}catch{}context=null;source=null;gain=null;}
 const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
 try{if('audioSession'in navigator)navigator.audioSession.type='playback';}catch{}
 context=new Ctx();contextCreatedAt=Date.now();contextEverRunning=false;gain=context.createGain();gain.gain.value=volume();gain.connect(context.destination);source=context.createMediaElementSource(audio);source.connect(gain);
 context.addEventListener('statechange',()=>{if(context?.state==='running'){contextEverRunning=true;if(activeRealm&&desired())audio.play().then(syncControls).catch(syncControls);}});
}
const status=()=>Boolean(audio&&!audio.paused&&!audio.ended&&(!context||context.state==='running'));
function syncControls(){
 if(!button)return;const s=strings(),playing=status();button.setAttribute('aria-label',playing?s.off:s.on);button.title=playing?s.off:s.on;button.setAttribute('aria-pressed',String(playing));button.classList.toggle('is-playing',playing);button.firstElementChild.textContent=playing?'♫':'♪';
 popover.setAttribute('dir',language()==='ar'?'rtl':'ltr');popover.querySelector('[data-music-title]').textContent=s.music;popover.querySelector('[data-music-hint]').textContent=(hints[language()]||hints.en)[playing?0:1];popover.querySelector('[data-music-volume-label]').textContent=s.volume;popover.querySelector('[data-music-close]').setAttribute('aria-label',s.close);popover.querySelector('.reader-music-error').textContent=s.unavailable;popover.querySelector('.reader-music-error').hidden=!audio?.dataset.failed;
}
function pause(){audio?.pause();syncControls();}
function play(){
 if(!audio||!activeRealm||!desired()||document.hidden)return;
 delete audio.dataset.failed;getGain();if(context?.state!=='running')context?.resume().catch(()=>{});
 audio.play().then(()=>{if(!activeRealm||!desired()||document.hidden)audio.pause();syncControls();}).catch(()=>syncControls());
}
function positionPopover(){
 if(!button||!popover||popover.hidden)return;const rect=button.getBoundingClientRect(),width=Math.min(310,innerWidth-24),height=popover.getBoundingClientRect().height;
 popover.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right-width))+'px';popover.style.top=Math.max(12,Math.min(innerHeight-height-12,rect.bottom+8))+'px';
}
function dismiss(){clearTimeout(hideTimer);if(popover)popover.hidden=true;}
function showHint(){
 popover.hidden=false;syncControls();positionPopover();clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!popover.matches(':hover')&&!popover.contains(document.activeElement))dismiss();},6500);
}
function buildUI(){
 if(button)return;const s=strings();button=document.createElement('button');button.type='button';button.className='reader-music-button';button.innerHTML='<span aria-hidden="true">♪</span>';
 popover=document.createElement('section');popover.className='reader-music-popover';popover.hidden=true;popover.innerHTML='<div class="reader-music-heading"><span data-music-title></span><button type="button" data-music-close>×</button></div><p data-music-hint role="status"></p><label class="reader-music-volume"><span data-music-volume-label></span><input data-music-volume type="range" min="0" max="1" step="0.01" value="'+volume()+'"><output>'+Math.round(volume()*100)+'%</output></label><p class="reader-music-error" role="status" hidden></p>';
 dock=document.createElement('div');dock.className='reader-music-dock';dock.append(button);document.body.append(dock,popover);
 button.addEventListener('click',()=>{musicEnabled[activeRealm]=!status();if(desired())play();else pause();showHint();});
 button.addEventListener('mouseenter',showHint);button.addEventListener('focus',showHint);
 popover.querySelector('[data-music-close]').addEventListener('click',dismiss);
 popover.querySelector('[data-music-volume]').addEventListener('input',event=>{const value=Number(event.target.value);storage.set('alux-reader-music-volume',String(value));if(gain)gain.gain.setTargetAtTime(value,context.currentTime,.025);popover.querySelector('output').textContent=Math.round(value*100)+'%';clearTimeout(hideTimer);});
 document.addEventListener('click',event=>{const path=event.composedPath();if(!path.includes(popover)&&!path.includes(button))dismiss();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();});syncControls();
}
export function syncReaderMusic(realm){
 const next=validRealm(realm)?realm:null;if(!next&&!dock)return;buildUI();if(!audio)bindAudio();
 if(next){document.querySelector(next==='magic'?'.bound-tools':'.real-toolbar-left')?.append(dock);}
 if(next===activeRealm){syncControls();return;}activeRealm=next;dismiss();
 if(!next){pause();dock.hidden=true;return;}pause();musicEnabled[next]=next==='magic';dock.hidden=false;
 if(desired())play();showHint();
}
function onGesture(event){
 if(!activeRealm&&document.body.classList.contains('gateway-view')&&event.target?.closest?.('.world-choice')){if(!audio)bindAudio();getGain();context?.resume().catch(()=>{});return;}
 if(!activeRealm||!desired()||document.hidden||event.composedPath().includes(button)||event.composedPath().includes(popover))return;
 if(context&&context.state!=='running'&&contextEverRunning&&Date.now()-contextCreatedAt>1000)getGain(true);
 if(!status())play();
}
for(const type of ['pointerdown','touchend','click','keydown'])document.addEventListener(type,onGesture,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(activeRealm&&desired())play();});
window.addEventListener('resize',positionPopover);window.addEventListener('scroll',positionPopover,{passive:true});window.addEventListener('pagehide',pause);
export function disposeReaderMusic(){pause();dismiss();dock?.remove();popover?.remove();audio?.remove();try{context?.close()}catch{}audio=null;context=null;gain=null;source=null;button=null;popover=null;dock=null;activeRealm=null;}
