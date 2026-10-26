import type { LanguageCode } from './locale-routing.ts';
export type VariableMessage =
  | {
      key: 'minutes' | 'results' | 'chapterCount' | 'readingSize';
      value: number;
    }
  | { key: 'part'; value: string; begin?: boolean }
  | { key: 'explore'; value: string };
const columns: Record<LanguageCode, number> = {
  en: 0,
  zh: 1,
  ko: 2,
  ja: 3,
  ar: 4,
  'zh-hant': 5,
  vi: 6,
  ru: 7,
  uk: 8,
  de: 9,
  es: 10
};
/** Variable labels use explicit keys and values, never regular expressions over rendered text. */
export function formatMessage(
  locale: LanguageCode,
  message: VariableMessage
): string {
  const value = String(message.value),
    column = columns[locale];
  const plural = (words: Record<string, string>): string =>
    words[new Intl.PluralRules(locale).select(Number(value))] ||
    words.other ||
    '';
  switch (message.key) {
    case 'minutes':
      return (
        [
          value + ' min',
          value + ' 分钟',
          value + '분',
          value + '分',
          value + ' دقائق',
          value + ' 分鐘',
          value + ' phút',
          value + ' мин',
          value + ' хв',
          value + ' Min.',
          value + ' min'
        ][column] || ''
      );
    case 'results':
      return {
        en: value + ' ' + (value === '1' ? 'RESULT' : 'RESULTS'),
        zh: value + ' 条结果',
        'zh-hant': value + ' 條結果',
        ko: value + '개 결과',
        ja: value + '件',
        vi: value + ' kết quả',
        de: value + ' ' + plural({ one: 'Ergebnis', other: 'Ergebnisse' }),
        es: value + ' ' + plural({ one: 'resultado', other: 'resultados' }),
        ru:
          value +
          ' ' +
          plural({
            one: 'результат',
            few: 'результата',
            many: 'результатов',
            other: 'результата'
          }),
        uk:
          value +
          ' ' +
          plural({
            one: 'результат',
            few: 'результати',
            many: 'результатів',
            other: 'результату'
          }),
        ar: plural({
          zero: value + ' نتيجة',
          one: 'نتيجة واحدة',
          two: 'نتيجتان',
          few: value + ' نتائج',
          many: value + ' نتيجة',
          other: value + ' نتيجة'
        })
      }[locale];
    case 'part':
      return (
        [
          (message.begin ? 'Begin Part ' : 'Part ') + value,
          '第 ' + value + ' 部',
          value + '부',
          value + '部',
          'الجزء ' + value,
          '第 ' + value + ' 部',
          'Phần ' + value,
          'Часть ' + value,
          'Частина ' + value,
          'Teil ' + value,
          'Parte ' + value
        ][column] || ''
      );
    case 'chapterCount':
      return (
        [
          value + ' CHAPTERS TO EXPLORE',
          value + ' 个章节',
          value + '개 장',
          value + '章',
          value + ' فصول',
          value + ' 個章節',
          value + ' chương',
          value + ' глав',
          value + ' розділів',
          value + ' Kapitel',
          value + ' capítulos'
        ][column] || ''
      );
    case 'readingSize':
      return (
        [
          'Reading size ' + value + ' pixels',
          '字号为 ' + value + ' 像素',
          '글자 크기 ' + value + '픽셀',
          '文字サイズ ' + value + 'ピクセル',
          'حجم النص ' + value + ' بكسل',
          '字級為 ' + value + ' 像素',
          'Cỡ chữ ' + value + ' pixel',
          'Размер текста: ' + value + ' пикс.',
          'Розмір тексту: ' + value + ' пікс.',
          'Schriftgröße: ' + value + ' Pixel',
          'Tamaño del texto: ' + value + ' píxeles'
        ][column] || ''
      );
    case 'explore':
      return (
        [
          'Explore ' + value,
          '探索 ' + value,
          value + ' 탐색',
          value + 'を探る',
          'استكشف ' + value,
          '探索 ' + value,
          'Khám phá ' + value,
          'Изучить ' + value,
          'Дослідити ' + value,
          value + ' erkunden',
          'Explorar ' + value
        ][column] || ''
      );
  }
}
