export const MEMFIRE_CONFIG = {
  url:
    (typeof process !== 'undefined' && process.env?.FIRE_DB_URL) ||
    'https://d4v5cc8g91htqli3veng.baseapi.memfiredb.com',
  anonKey:
    (typeof process !== 'undefined' && process.env?.FIRE_DB_ANON) || '',
  serviceRoleKey:
    (typeof process !== 'undefined' && process.env?.FIRE_DB_SERV) || '',
  tablePrefix: '_block',
  tables: {
    users: '_block_users',
    leaderboard: '_block_leaderboard',
    progress: '_block_game_progress',
  },
};
