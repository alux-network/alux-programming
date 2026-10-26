import type { LanguageCode } from './locale-routing.ts';
export type MusicCopy = {
  music: string;
  on: string;
  off: string;
  volume: string;
  close: string;
  promptTitle: string;
  promptBody: string;
  withMusic: string;
  withoutMusic: string;
  unavailable: string;
};
export const musicCopy: Record<LanguageCode, MusicCopy> = {
  en: {
    music: 'Reading music',
    on: 'Play music',
    off: 'Pause music',
    volume: 'Volume',
    close: 'Close',
    promptTitle: 'A little music for this world?',
    promptBody:
      'Let the forest breathe softly in the background while you read.',
    withMusic: 'Read with music',
    withoutMusic: 'Read without music',
    unavailable: 'Music could not start. Try again from the music button.'
  },
  zh: {
    music: '阅读音乐',
    on: '播放音乐',
    off: '暂停音乐',
    volume: '音量',
    close: '关闭',
    promptTitle: '为这个世界添一点音乐？',
    promptBody: '让森林的呼吸轻轻陪伴你的阅读。',
    withMusic: '伴随音乐阅读',
    withoutMusic: '不播放音乐',
    unavailable: '音乐暂时无法播放，请点音乐按钮重试。'
  },
  'zh-hant': {
    music: '閱讀音樂',
    on: '播放音樂',
    off: '暫停音樂',
    volume: '音量',
    close: '關閉',
    promptTitle: '為這個世界添一點音樂？',
    promptBody: '讓森林的呼吸輕輕陪伴你的閱讀。',
    withMusic: '伴隨音樂閱讀',
    withoutMusic: '不播放音樂',
    unavailable: '音樂暫時無法播放，請點音樂按鈕重試。'
  },
  ja: {
    music: '読書の音楽',
    on: '音楽を再生',
    off: '音楽を一時停止',
    volume: '音量',
    close: '閉じる',
    promptTitle: 'この世界に音楽を添えますか？',
    promptBody: '森の息吹を背景に、ゆっくり読書をお楽しみください。',
    withMusic: '音楽と読む',
    withoutMusic: '音楽なしで読む',
    unavailable: '音楽を再生できません。音楽ボタンから再試行してください。'
  },
  ko: {
    music: '읽기 음악',
    on: '음악 재생',
    off: '음악 일시 정지',
    volume: '음량',
    close: '닫기',
    promptTitle: '이 세계에 음악을 더할까요?',
    promptBody: '숲의 숨결을 배경으로 편안하게 읽어 보세요.',
    withMusic: '음악과 함께 읽기',
    withoutMusic: '음악 없이 읽기',
    unavailable: '음악을 재생할 수 없습니다. 음악 버튼을 눌러 다시 시도하세요.'
  },
  ar: {
    music: 'موسيقى القراءة',
    on: 'تشغيل الموسيقى',
    off: 'إيقاف الموسيقى مؤقتًا',
    volume: 'مستوى الصوت',
    close: 'إغلاق',
    promptTitle: 'هل ترغب في موسيقى لهذا العالم؟',
    promptBody: 'دع أنفاس الغابة ترافق قراءتك بهدوء.',
    withMusic: 'القراءة مع الموسيقى',
    withoutMusic: 'القراءة دون موسيقى',
    unavailable: 'تعذر تشغيل الموسيقى. حاول مجددًا من زر الموسيقى.'
  },
  de: {
    music: 'Lesemusik',
    on: 'Musik abspielen',
    off: 'Musik pausieren',
    volume: 'Lautstärke',
    close: 'Schließen',
    promptTitle: 'Ein wenig Musik für diese Welt?',
    promptBody: 'Lass den Atem des Waldes deine Lektüre sanft begleiten.',
    withMusic: 'Mit Musik lesen',
    withoutMusic: 'Ohne Musik lesen',
    unavailable:
      'Die Musik konnte nicht starten. Versuche es über die Musiktaste erneut.'
  },
  es: {
    music: 'Música para leer',
    on: 'Reproducir música',
    off: 'Pausar música',
    volume: 'Volumen',
    close: 'Cerrar',
    promptTitle: '¿Un poco de música para este mundo?',
    promptBody: 'Deja que el aliento del bosque acompañe tu lectura.',
    withMusic: 'Leer con música',
    withoutMusic: 'Leer sin música',
    unavailable:
      'No se pudo iniciar la música. Vuelve a intentarlo desde el botón.'
  },
  vi: {
    music: 'Nhạc đọc sách',
    on: 'Phát nhạc',
    off: 'Tạm dừng nhạc',
    volume: 'Âm lượng',
    close: 'Đóng',
    promptTitle: 'Thêm chút nhạc cho thế giới này nhé?',
    promptBody: 'Để hơi thở khu rừng dịu dàng đồng hành cùng bạn đọc.',
    withMusic: 'Đọc cùng âm nhạc',
    withoutMusic: 'Đọc không nhạc',
    unavailable: 'Không thể phát nhạc. Hãy thử lại bằng nút âm nhạc.'
  },
  ru: {
    music: 'Музыка для чтения',
    on: 'Включить музыку',
    off: 'Приостановить музыку',
    volume: 'Громкость',
    close: 'Закрыть',
    promptTitle: 'Добавить немного музыки в этот мир?',
    promptBody: 'Пусть дыхание леса мягко сопровождает чтение.',
    withMusic: 'Читать с музыкой',
    withoutMusic: 'Читать без музыки',
    unavailable: 'Не удалось запустить музыку. Попробуйте снова кнопкой музыки.'
  },
  uk: {
    music: 'Музика для читання',
    on: 'Увімкнути музику',
    off: 'Призупинити музику',
    volume: 'Гучність',
    close: 'Закрити',
    promptTitle: 'Додати трохи музики до цього світу?',
    promptBody: 'Нехай подих лісу тихо супроводжує читання.',
    withMusic: 'Читати з музикою',
    withoutMusic: 'Читати без музики',
    unavailable: 'Не вдалося запустити музику. Спробуйте ще раз кнопкою музики.'
  }
};

export const musicHints: Record<LanguageCode, string[]> = {
  en: [
    'Music is on. Click the note to pause.',
    'Music is off. Click the note to play.'
  ],
  zh: ['音乐已开启，点击音符即可关闭。', '音乐已关闭，点击音符即可开启。'],
  'zh-hant': [
    '音樂已開啟，點擊音符即可關閉。',
    '音樂已關閉，點擊音符即可開啟。'
  ],
  ja: [
    '音楽を再生中。音符を押すと停止します。',
    '音楽は停止中。音符を押すと再生します。'
  ],
  ko: [
    '음악이 켜져 있습니다. 음표를 누르면 꺼집니다.',
    '음악이 꺼져 있습니다. 음표를 누르면 켜집니다.'
  ],
  vi: [
    'Nhạc đang bật. Nhấn nốt nhạc để tắt.',
    'Nhạc đang tắt. Nhấn nốt nhạc để bật.'
  ],
  de: [
    'Musik läuft. Zum Pausieren auf die Note klicken.',
    'Musik ist aus. Zum Abspielen auf die Note klicken.'
  ],
  es: [
    'Música activada. Pulsa la nota para pausarla.',
    'Música desactivada. Pulsa la nota para reproducirla.'
  ],
  ru: [
    'Музыка включена. Нажмите на ноту, чтобы выключить.',
    'Музыка выключена. Нажмите на ноту, чтобы включить.'
  ],
  uk: [
    'Музику ввімкнено. Натисніть ноту, щоб вимкнути.',
    'Музику вимкнено. Натисніть ноту, щоб увімкнути.'
  ],
  ar: [
    'الموسيقى تعمل. اضغط النوتة لإيقافها.',
    'الموسيقى متوقفة. اضغط النوتة لتشغيلها.'
  ]
};
