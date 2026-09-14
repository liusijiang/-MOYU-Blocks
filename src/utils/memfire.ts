import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MEMFIRE_CONFIG } from '../constants/memfireConfig';
import {
  UserProfile,
  LeaderboardEntry,
  ScoreRankContext,
  CloudGameProgress,
} from '../types';

let supabaseClient: SupabaseClient | null = null;

export function getMemfireClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = MEMFIRE_CONFIG.url;
    const key = MEMFIRE_CONFIG.anonKey;
    if (!url || !key) {
      console.warn('MemFireDB URL 或匿名公钥尚未配置');
    }
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * 客户端加盐密码哈希 (SHA-256)
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '::' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成防混淆大写短格式安全恢复码: SEC-XXXX-XXXX-YYYY
 */
export function generateSecurityCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆的 0, O, 1, I
  const randomPart = (len: number) => {
    let res = '';
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < len; i++) {
      res += chars[bytes[i] % chars.length];
    }
    return res;
  };
  const year = new Date().getFullYear();
  return `SEC-${randomPart(4)}-${randomPart(4)}-${year}`;
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 缓存当前登录用户到本地
const LOCAL_USER_KEY = 'block_puzzle_current_user';

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: UserProfile | null) {
  try {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  } catch (err) {
    console.error('saveStoredUser error', err);
  }
}

/**
 * 1. 登录注册二合一 (通过数据库受控 RPC: rpc_login_or_register)
 * 输入 username + password。后端原子完成老用户验密或新用户注册并返回安全码。
 */
export async function loginOrRegister(
  usernameInput: string,
  passwordInput: string
): Promise<{ user: UserProfile; isNewUser: boolean; securityCode?: string; error?: string }> {
  try {
    const client = getMemfireClient();
    const cleanUsername = usernameInput.trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      return { user: null as unknown as UserProfile, isNewUser: false, error: '用户名至少需要 2 个字符' };
    }
    if (!passwordInput || passwordInput.length < 4) {
      return { user: null as unknown as UserProfile, isNewUser: false, error: '密码长度至少需要 4 位' };
    }

    const proposedSecurityCode = generateSecurityCode();
    const { data, error } = await client.rpc('rpc_login_or_register', {
      p_username: cleanUsername,
      p_password: passwordInput,
      p_security_code: proposedSecurityCode,
    });

    if (error) {
      console.error('rpc_login_or_register err:', error);
      return { user: null as unknown as UserProfile, isNewUser: false, error: error.message || '登录异常' };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (!result || !result.success) {
      return { user: null as unknown as UserProfile, isNewUser: false, error: result?.error || '登录或注册失败' };
    }

    const profile: UserProfile = {
      id: result.user.id,
      username: result.user.username,
      securityCode: result.security_code || undefined,
      createdAt: result.user.created_at,
    };
    saveStoredUser(profile);

    return {
      user: profile,
      isNewUser: !!result.is_new_user,
      securityCode: result.security_code,
    };
  } catch (err: any) {
    return { user: null as unknown as UserProfile, isNewUser: false, error: err?.message || '网络连接异常' };
  }
}

/**
 * 2. 忘记密码 (仅需 security_code 校验，通过受控 RPC 反查识别绑定用户)
 */
export async function verifySecurityCodeOnly(
  securityCodeInput: string
): Promise<{ success: boolean; username?: string; userId?: string; error?: string }> {
  try {
    const client = getMemfireClient();
    const cleanCode = securityCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: '请输入安全恢复码' };
    }

    const { data, error } = await client.rpc('rpc_verify_security_code', {
      p_security_code: cleanCode,
    });

    if (error) {
      return { success: false, error: error.message || '校验失败' };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (!result || !result.success) {
      return { success: false, error: result?.error || '无效的安全恢复码，未匹配到任何账号' };
    }

    return { success: true, username: result.username, userId: result.user_id };
  } catch (err: any) {
    return { success: false, error: err?.message || '校验失败' };
  }
}

/**
 * 3. 忘记密码重设密码 (通过受控 RPC 重设密码并原子轮换全新 security_code)
 */
export async function resetPasswordWithCode(
  securityCodeInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; newSecurityCode?: string; user?: UserProfile; error?: string }> {
  try {
    const client = getMemfireClient();
    const cleanCode = securityCodeInput.trim().toUpperCase();
    if (newPasswordInput.length < 4) {
      return { success: false, error: '新密码至少需要 4 位字符' };
    }

    const newSecurityCode = generateSecurityCode();
    const { data, error } = await client.rpc('rpc_reset_password_with_code', {
      p_security_code: cleanCode,
      p_new_password: newPasswordInput,
      p_new_code: newSecurityCode,
    });

    if (error) {
      return { success: false, error: error.message || '重设密码失败' };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (!result || !result.success) {
      return { success: false, error: result?.error || '旧安全恢复码验证失败，拒绝重设密码' };
    }

    const updatedProfile: UserProfile = {
      id: result.user.id,
      username: result.user.username,
      securityCode: result.new_security_code,
    };
    saveStoredUser(updatedProfile);

    return {
      success: true,
      newSecurityCode: result.new_security_code,
      user: updatedProfile,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || '重设密码发生异常' };
  }
}

/**
 * 4. 主动修改密码 (提供当前 security_code，通过受控 RPC 校验并轮换新 code)
 */
export async function updatePasswordWithCode(
  userId: string,
  currentCodeInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; newSecurityCode?: string; error?: string }> {
  try {
    const client = getMemfireClient();
    const cleanCode = currentCodeInput.trim().toUpperCase();
    if (newPasswordInput.length < 4) {
      return { success: false, error: '新密码至少需要 4 位' };
    }

    const newSecurityCode = generateSecurityCode();
    const { data, error } = await client.rpc('rpc_update_password_with_code', {
      p_user_id: userId,
      p_current_code: cleanCode,
      p_new_password: newPasswordInput,
      p_new_code: newSecurityCode,
    });

    if (error) {
      return { success: false, error: error.message || '修改密码失败' };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (!result || !result.success) {
      return { success: false, error: result?.error || '修改密码失败' };
    }

    return { success: true, newSecurityCode: result.new_security_code };
  } catch (err: any) {
    return { success: false, error: err?.message || '修改密码失败' };
  }
}

/**
 * 5. 获取指定分数的排位以及与上一名/榜首的差值 (调用数据库 RPC 函数 get_score_rank_context)
 */
export async function fetchScoreRankContext(score: number): Promise<ScoreRankContext> {
  const fallback: ScoreRankContext = {
    currentRank: 1,
    higherRankScore: null,
    deltaToHigher: 0,
    topScore: score,
    deltaToTop: 0,
  };

  try {
    const client = getMemfireClient();
    const { data, error } = await client.rpc('get_score_rank_context', {
      p_score: score,
    });

    if (error || !data) {
      // 容错: 若 RPC 出现错误，前端从 leaderboard 表直查做基础补全
      const { data: topRows } = await client
        .from(MEMFIRE_CONFIG.tables.leaderboard)
        .select('high_score')
        .order('high_score', { ascending: false })
        .limit(1);
      const topScore = topRows?.[0]?.high_score || score;
      return {
        ...fallback,
        topScore: Math.max(topScore, score),
        deltaToTop: Math.max(0, topScore - score),
      };
    }

    return {
      currentRank: Number(data.current_rank || 1),
      higherRankScore: data.higher_rank_score !== null ? Number(data.higher_rank_score) : null,
      deltaToHigher: Number(data.delta_to_higher || 0),
      topScore: Number(data.top_score || score),
      deltaToTop: Number(data.delta_to_top || 0),
    };
  } catch (err) {
    console.error('fetchScoreRankContext error:', err);
    return fallback;
  }
}

/**
 * 6. 更新或插入全服高分榜单
 */
export async function upsertHighScore(userId: string, username: string, score: number): Promise<void> {
  try {
    if (!userId || score <= 0) return;
    const client = getMemfireClient();

    // 先查当前用户的历史最高分
    const { data: record } = await client
      .from(MEMFIRE_CONFIG.tables.leaderboard)
      .select('high_score')
      .eq('user_id', userId)
      .maybeSingle();

    if (!record || score > record.high_score) {
      await client.from(MEMFIRE_CONFIG.tables.leaderboard).upsert(
        {
          user_id: userId,
          username: username,
          high_score: score,
          achieved_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }
  } catch (err) {
    console.error('upsertHighScore error', err);
  }
}

/**
 * 7. 获取全服排行榜 Top 50
 */
export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  try {
    const client = getMemfireClient();
    const { data, error } = await client
      .from(MEMFIRE_CONFIG.tables.leaderboard)
      .select('id, user_id, username, high_score, achieved_at')
      .order('high_score', { ascending: false })
      .order('achieved_at', { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      username: item.username,
      highScore: item.high_score,
      achievedAt: item.achieved_at,
    }));
  } catch (err) {
    console.error('fetchLeaderboard error', err);
    return [];
  }
}

/**
 * 8. 保存进行中的游戏对局进度
 */
export async function saveGameProgress(progress: CloudGameProgress): Promise<boolean> {
  try {
    if (!progress.userId) return false;
    const client = getMemfireClient();
    const { error } = await client.from(MEMFIRE_CONFIG.tables.progress).upsert(
      {
        user_id: progress.userId,
        username: progress.username,
        score: progress.score,
        board_data: progress.boardData,
        placed_pieces: progress.placedPieces,
        current_pieces: progress.currentPieces,
        is_game_over: progress.isGameOver,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) {
      console.error('saveGameProgress error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveGameProgress error', err);
    return false;
  }
}

/**
 * 9. 获取进行中的对局存档 (若存在且未 GameOver)
 */
export async function fetchGameProgress(userId: string): Promise<CloudGameProgress | null> {
  try {
    if (!userId) return null;
    const client = getMemfireClient();
    const { data, error } = await client
      .from(MEMFIRE_CONFIG.tables.progress)
      .select('user_id, username, score, board_data, placed_pieces, current_pieces, is_game_over, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      username: data.username,
      score: data.score,
      boardData: data.board_data,
      placedPieces: data.placed_pieces || [],
      currentPieces: data.current_pieces || [],
      isGameOver: !!data.is_game_over,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error('fetchGameProgress error', err);
    return null;
  }
}

/**
 * 10. 清除当前对局存档 (游戏结束或玩家主动重新开始)
 */
export async function clearGameProgress(userId: string): Promise<void> {
  try {
    if (!userId) return;
    const client = getMemfireClient();
    await client
      .from(MEMFIRE_CONFIG.tables.progress)
      .update({
        is_game_over: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } catch (err) {
    console.error('clearGameProgress err', err);
  }
}
