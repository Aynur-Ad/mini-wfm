export interface Holiday {
  date: string;
  name: string;
  halfDay: boolean;
}
// Kaynaklar: https://www.borsaistanbul.com/resmi-tatil-gunleri (2026),
// https://dhmi.gov.tr/AIPDocuments/LT_GEN_2_1_en.pdf (2027), Diyanet dini günler takvimi.
// İdari izinler eklenmez. 2027-05-19 iki bayrama denk gelir; gün bir kez sayılır.
export const HOLIDAYS: readonly Holiday[] = Object.freeze(
  [2026, 2027]
    .flatMap((year) => [
      { date: `${year}-01-01`, name: 'Yılbaşı', halfDay: false },
      {
        date: `${year}-04-23`,
        name: 'Ulusal Egemenlik ve Çocuk Bayramı',
        halfDay: false,
      },
      { date: `${year}-05-01`, name: 'Emek ve Dayanışma Günü', halfDay: false },
      {
        date: `${year}-05-19`,
        name: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı',
        halfDay: false,
      },
      {
        date: `${year}-07-15`,
        name: 'Demokrasi ve Millî Birlik Günü',
        halfDay: false,
      },
      { date: `${year}-08-30`, name: 'Zafer Bayramı', halfDay: false },
      {
        date: `${year}-10-28`,
        name: 'Cumhuriyet Bayramı arifesi',
        halfDay: true,
      },
      { date: `${year}-10-29`, name: 'Cumhuriyet Bayramı', halfDay: false },
    ])
    .concat([
      { date: '2026-03-19', name: 'Ramazan arifesi', halfDay: true },
      ...['20', '21', '22'].map((day) => ({
        date: `2026-03-${day}`,
        name: 'Ramazan Bayramı',
        halfDay: false,
      })),
      { date: '2026-05-26', name: 'Kurban arifesi', halfDay: true },
      ...['27', '28', '29', '30'].map((day) => ({
        date: `2026-05-${day}`,
        name: 'Kurban Bayramı',
        halfDay: false,
      })),
      { date: '2027-03-08', name: 'Ramazan arifesi', halfDay: true },
      ...['09', '10', '11'].map((day) => ({
        date: `2027-03-${day}`,
        name: 'Ramazan Bayramı',
        halfDay: false,
      })),
      { date: '2027-05-15', name: 'Kurban arifesi', halfDay: true },
      ...['16', '17', '18'].map((day) => ({
        date: `2027-05-${day}`,
        name: 'Kurban Bayramı',
        halfDay: false,
      })),
    ])
    .map((holiday) => Object.freeze(holiday))
    .sort((a, b) => a.date.localeCompare(b.date)),
);