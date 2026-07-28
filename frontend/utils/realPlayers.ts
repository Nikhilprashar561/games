export const REAL_PLAYER_NAMES = [
  'Rohan_Pro',
  'Vikram_99',
  'Priya_Gamer',
  'Kabir_VIP',
  'Amit_Roy',
  'Neha_Star',
  'Ananya_Play',
  'Sameer_Win',
  'Karan_Ace',
  'Siddharth_X',
  'Deepak_Grandmaster',
  'Meera_Queen',
  'Rishi_Tiger',
];

export const getRandomOpponentName = () => {
  const randomIndex = Math.floor(Math.random() * REAL_PLAYER_NAMES.length);
  return REAL_PLAYER_NAMES[randomIndex];
};
