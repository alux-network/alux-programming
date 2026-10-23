import {language} from './i18n.js';

const labels={
 en:['Listen to the welcome','Replay welcome','Stop welcome'],
 zh:['聆听欢迎语','重播欢迎语','停止播放'],
 'zh-hant':['聆聽歡迎語','重播歡迎語','停止播放'],
 ja:['歓迎の言葉を聴く','もう一度聴く','再生を停止'],
 ko:['환영 인사 듣기','다시 듣기','재생 중지'],
 vi:['Nghe lời chào','Nghe lại lời chào','Dừng phát'],
 de:['Begrüßung anhören','Erneut anhören','Wiedergabe stoppen'],
 es:['Escuchar la bienvenida','Volver a escuchar','Detener reproducción'],
 ru:['Послушать приветствие','Повторить приветствие','Остановить'],
 uk:['Послухати привітання','Повторити привітання','Зупинити'],
 ar:['استمع إلى الترحيب','أعد سماع الترحيب','إيقاف التشغيل']
};

export function mountGatewayWelcome(root){
 const locale=language(),copy=labels[locale]||labels.en;
 const audio=new Audio(`${import.meta.env.BASE_URL}audio/welcome/${locale}.mp3`);
 audio.preload='auto';audio.loop=false;audio.volume=1;audio.hidden=true;audio.dataset.gatewayWelcome='';audio.setAttribute('aria-hidden','true');let disposed=false,played=false,stopped=false;
 const button=document.createElement('button');button.type='button';button.className='gateway-welcome';
 const update=()=>{const playing=!audio.paused&&!audio.ended;button.textContent=playing?'◼ '+copy[2]:'▷ '+copy[played?1:0];button.setAttribute('aria-label',copy[playing?2:played?1:0]);button.dataset.playing=String(playing);};
 const play=()=>{if(disposed||document.hidden)return;audio.play().then(()=>{if(disposed||stopped){audio.pause();return;}played=true;update();}).catch(()=>update());};
 const unlock=event=>{if(event.composedPath().includes(button)||played||stopped||disposed)return;play();};
 const gestures=['pointerdown','touchend','click','keydown'];
 for(const type of gestures)document.addEventListener(type,unlock,{capture:true,passive:true});
 button.title=copy[2]+' / '+copy[1];
 button.addEventListener('click',()=>{if(audio.paused||audio.ended){stopped=false;audio.currentTime=0;play();}else{stopped=true;audio.pause();update();}});
 for(const event of ['playing','pause','ended','error'])audio.addEventListener(event,update);
 const visibility=()=>{if(document.hidden)audio.pause();};document.addEventListener('visibilitychange',visibility);
 root.append(audio,button);update();play();
 return ()=>{disposed=true;for(const type of gestures)document.removeEventListener(type,unlock,{capture:true});audio.pause();audio.removeAttribute('src');audio.load();button.remove();document.removeEventListener('visibilitychange',visibility);};
}
