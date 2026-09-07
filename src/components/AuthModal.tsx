import React, { useState } from 'react';
import {
  UserProfile,
} from '../types';
import {
  loginOrRegister,
  verifySecurityCodeOnly,
  resetPasswordWithCode,
  updatePasswordWithCode,
} from '../utils/memfire';
import {
  ShieldAlert,
  KeyRound,
  UserCheck,
  Camera,
  Copy,
  Check,
  X,
  AlertTriangle,
  Lock,
  User,
  ArrowRight,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
}

type ModalView = 'auth' | 'security_code_alert' | 'forgot_password' | 'account_settings';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [view, setView] = useState<ModalView>(currentUser ? 'account_settings' : 'auth');

  // 登录/注册表单
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 安全码全屏提醒展示状态
  const [shownCode, setShownCode] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeContextMsg, setCodeContextMsg] = useState<string>('');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);

  // 忘记密码状态 (仅需 security_code)
  const [forgotCodeInput, setForgotCodeInput] = useState('');
  const [recognizedUsername, setRecognizedUsername] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // 修改密码状态
  const [currentCodeInput, setCurrentCodeInput] = useState('');
  const [changeNewPassInput, setChangeNewPassInput] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. 提交登录/注册
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const result = await loginOrRegister(usernameInput, passwordInput);
      if (result.error || !result.user) {
        setAuthError(result.error || '登录或注册失败');
      } else {
        if (result.isNewUser && result.securityCode) {
          // 新用户注册成功，必须全屏醒目弹出安全码并要求截图
          setShownCode(result.securityCode);
          setCodeContextMsg('恭喜新账号注册成功！这是您用于找回与重置密码的唯一凭证。');
          setPendingUser(result.user);
          setView('security_code_alert');
        } else {
          // 老用户登录成功
          onLoginSuccess(result.user);
          onClose();
        }
      }
    } catch (err: any) {
      setAuthError(err.message || '网络通讯异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. 忘记密码 - 第一步：校验 security_code
  const handleVerifyForgotCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setIsVerifyingCode(true);

    try {
      const res = await verifySecurityCodeOnly(forgotCodeInput);
      if (!res.success || !res.username) {
        setForgotError(res.error || '无法识别该安全恢复码');
      } else {
        setRecognizedUsername(res.username);
      }
    } catch (err: any) {
      setForgotError(err.message || '校验异常');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // 2. 忘记密码 - 第二步：设置新密码并轮换新 code
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (newPasswordInput !== confirmPasswordInput) {
      setForgotError('两次输入的新密码不一致');
      return;
    }
    if (newPasswordInput.length < 4) {
      setForgotError('新密码长度不能少于 4 位');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithCode(forgotCodeInput, newPasswordInput);
      if (!res.success || !res.newSecurityCode || !res.user) {
        setForgotError(res.error || '密码重设失败');
      } else {
        // 成功重设，必须弹窗展现轮换后的全新安全码！
        setShownCode(res.newSecurityCode);
        setCodeContextMsg('密码已成功重设！旧安全码已作废，系统为您轮换生成了全新的专属安全恢复码。');
        setPendingUser(res.user);
        setView('security_code_alert');
      }
    } catch (err: any) {
      setForgotError(err.message || '重设发生异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. 修改密码 (已登录状态)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setChangeError(null);

    setIsSubmitting(true);
    try {
      const res = await updatePasswordWithCode(currentUser.id, currentCodeInput, changeNewPassInput);
      if (!res.success || !res.newSecurityCode) {
        setChangeError(res.error || '修改密码失败');
      } else {
        setShownCode(res.newSecurityCode);
        setCodeContextMsg('密码已成功修改！旧安全码已自动作废，这是您更新后的全新安全恢复码。');
        setPendingUser(currentUser);
        setView('security_code_alert');
      }
    } catch (err: any) {
      setChangeError(err.message || '修改异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 复制安全码
  const handleCopyCode = () => {
    if (!shownCode) return;
    navigator.clipboard.writeText(shownCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // 确认已保存并关闭安全码警示弹窗
  const handleConfirmCodeSaved = () => {
    if (pendingUser) {
      onLoginSuccess(pendingUser);
    }
    onClose();
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="auth-modal-container"
        className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden"
      >
        {/* 右上角关闭按钮 (在展示安全码强制界面时屏蔽直接关闭，防止未保存跳过) */}
        {view !== 'security_code_alert' && (
          <button
            id="auth-modal-close-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ----------------- 视图 1: 登录 / 注册二合一 ----------------- */}
        {view === 'auth' && (
          <div id="auth-form-view" className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">账号登录 / 注册</h3>
                <p className="text-xs text-slate-400">无需繁琐流程，输入用户名与密码即刻畅玩</p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-300 leading-relaxed">
              💡 <span className="font-semibold text-amber-300">二合一机制：</span>
              若用户名尚未注册，系统将<span className="text-emerald-400 font-bold">自动为您创建新账号</span>并生成专属安全找回码；若已注册则直接校验登录。
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-username-input"
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="输入用户名 (不少于 2 位)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">登录密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-password-input"
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="输入密码 (不少于 4 位)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  id="auth-goto-forgot-btn"
                  onClick={() => {
                    setForgotError(null);
                    setRecognizedUsername(null);
                    setForgotCodeInput('');
                    setView('forgot_password');
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                >
                  忘记密码？单凭安全码找回
                </button>
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '正在安全连接中...' : '进入游戏 / 立即登入'}
              </button>
            </form>
          </div>
        )}

        {/* ----------------- 视图 2: 安全恢复码展示与截图强警示 ----------------- */}
        {view === 'security_code_alert' && (
          <div id="security-code-alert-view" className="space-y-4 text-center py-1">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white tracking-wide">请立即截图保存专属安全码！</h3>
              <p className="text-xs text-amber-300/90 mt-1 font-medium">{codeContextMsg}</p>
            </div>

            {/* 安全码卡片 */}
            <div className="relative p-4 rounded-xl bg-slate-950/80 border-2 border-dashed border-amber-400/80 shadow-inner group">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                Your Security Recovery Code
              </span>
              <div
                id="security-code-display"
                className="font-mono text-2xl font-black text-amber-400 tracking-wider select-all"
              >
                {shownCode}
              </div>

              <button
                type="button"
                id="copy-security-code-btn"
                onClick={handleCopyCode}
                className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-600 transition-colors"
              >
                {codeCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">已复制到剪贴板</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>复制安全码</span>
                  </>
                )}
              </button>
            </div>

            {/* 严正警示区域 */}
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-left text-xs text-rose-300 flex items-start space-x-2.5">
              <Camera className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-rose-200 block">重要安全声明：</strong>
                我们不收集您的手机号或邮箱，<span className="underline font-bold text-white">此安全码是找回账号的唯一途径</span>。
                遗失该 code 将<strong className="text-amber-300">永久无法找回密码</strong>，请务必立即拍照或手机截图留存！
              </div>
            </div>

            <button
              id="confirm-code-saved-btn"
              type="button"
              onClick={handleConfirmCodeSaved}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold rounded-xl text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 text-slate-950" />
              <span>我已拍照/截图并妥善保存，进入游戏</span>
            </button>
          </div>
        )}

        {/* ----------------- 视图 3: 忘记密码 (单凭 security_code 恢复) ----------------- */}
        {view === 'forgot_password' && (
          <div id="forgot-password-view" className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">单码安全找回密码</h3>
                <p className="text-xs text-slate-400">无需记忆用户名，凭安全码即可重置并轮换新码</p>
              </div>
            </div>

            {forgotError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {!recognizedUsername ? (
              // 步骤 1: 仅输入安全码
              <form onSubmit={handleVerifyForgotCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    请输入您的安全恢复码 (Security Code)
                  </label>
                  <input
                    id="forgot-code-input"
                    type="text"
                    required
                    value={forgotCodeInput}
                    onChange={(e) => setForgotCodeInput(e.target.value.toUpperCase())}
                    placeholder="例: SEC-XXXX-XXXX-2026"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-mono text-center text-base text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase tracking-wider"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    * 输入此前保存的安全恢复码，系统将自动识别绑定的游戏用户名。
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setView('auth')}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition-colors"
                  >
                    返回登录
                  </button>
                  <button
                    id="verify-forgot-code-btn"
                    type="submit"
                    disabled={isVerifyingCode}
                    className="flex-2 py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center space-x-1"
                  >
                    <span>{isVerifyingCode ? '校验中...' : '校验安全码'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              // 步骤 2: 校验成功，展示用户名并输入新密码
              <form onSubmit={handleResetPassword} className="space-y-3.5 animate-fade-in">
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center space-x-3 text-xs text-emerald-300">
                  <UserCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                  <div>
                    <span className="text-slate-400 block text-[11px]">账号匹配成功：</span>
                    <strong className="text-white text-sm">用户名：{recognizedUsername}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">设置新密码</label>
                  <input
                    id="reset-new-password"
                    type="password"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="输入新密码 (不少于 4 位)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">再次确认新密码</label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    required
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="再次输入新密码"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300/90 leading-normal">
                  ⚠️ 提示：重置成功后，当前安全码将即刻失效，系统会为您生成并弹出全新的安全恢复码！
                </div>

                <div className="flex space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setRecognizedUsername(null)}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition-colors"
                  >
                    上一步
                  </button>
                  <button
                    id="submit-reset-password-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow transition-colors"
                  >
                    {isSubmitting ? '更新中...' : '确认重设并生成新安全码'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ----------------- 视图 4: 登录后个人信息与修改密码 ----------------- */}
        {view === 'account_settings' && currentUser && (
          <div id="account-settings-view" className="space-y-4">
            <div className="flex items-center space-x-3 mb-1">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">个人中心</h3>
                <p className="text-xs text-slate-400">已登录账号：<span className="text-emerald-400 font-bold">{currentUser.username}</span></p>
              </div>
            </div>

            {changeError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{changeError}</span>
              </div>
            )}

            <div className="p-3.5 bg-slate-800/70 border border-slate-700/60 rounded-xl">
              <h4 className="text-xs font-bold text-amber-300 mb-2.5 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>修改密码 (需当前安全恢复码)</span>
              </h4>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">当前安全恢复码</label>
                  <input
                    type="text"
                    required
                    value={currentCodeInput}
                    onChange={(e) => setCurrentCodeInput(e.target.value.toUpperCase())}
                    placeholder="SEC-XXXX-XXXX-YYYY"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">新登录密码</label>
                  <input
                    type="password"
                    required
                    value={changeNewPassInput}
                    onChange={(e) => setChangeNewPassInput(e.target.value)}
                    placeholder="输入新密码 (不少于 4 位)"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-colors"
                >
                  {isSubmitting ? '正在修改...' : '更新密码并轮换新安全码'}
                </button>
              </form>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition-colors"
              >
                继续游戏
              </button>
              <button
                id="logout-btn"
                type="button"
                onClick={() => {
                  onLogout();
                  setView('auth');
                }}
                className="py-2 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
