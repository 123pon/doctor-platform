import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import ChatWindow from './ChatWindow';
import './App.css';

function App() {
  // ================= 状态管理 =================
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  // 表单状态
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    doctorInviteCode: '',
    role: 'patient'
  });

  // 应用状态
  const [patients, setPatients] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [symptom, setSymptom] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // 二维码相关
  const [qrToken, setQrToken] = useState('');
  const [qrExpiry, setQrExpiry] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // ================= 监听认证状态 =================
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
      } else {
        setUserRole(null);
        setUserProfile(null);
        setCurrentView('dashboard');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ================= 监听 URL 参数（扫码绑定） =================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setQrToken(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!qrToken) return;

    if (!session) {
      setCurrentView('login');
      setMessage({ type: 'info', text: '🔗 检测到患者绑定请求，请使用医生账号登录完成绑定' });
      return;
    }

    if (userRole === 'doctor') {
      // 医生已登录，直接进入绑定页面
      setCurrentView('bind');
      return;
    }

    if (userRole === 'patient') {
      setCurrentView('dashboard');
      setMessage({ type: 'error', text: '当前登录的是患者账号，请使用医生账号扫码绑定。' });
      setQrToken(''); // 清除token
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [qrToken, session, userRole]);

  // ================= 获取用户资料 =================
  const fetchUserProfile = async (userId) => {
    try {
      // 首先检查是否是医生
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!doctorError && doctor) {
        setUserRole('doctor');
        setUserProfile(doctor);
        await fetchPatients();
        return;
      }

      // 检查是否是患者
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!patientError && patient) {
        setUserRole('patient');
        setUserProfile(patient);
        if (patient.doctor_id) {
          const doctor = await fetchDoctorInfo(patient.doctor_id);
          setDoctorProfile(doctor);
        } else {
          setDoctorProfile(null);
        }
        await fetchSubmissions(userId);
        return;
      }

      // 如果两个表都没有找到用户记录，可能是新注册用户
      // 这种情况不应该发生，因为注册时应该已经创建了记录
      console.warn('用户记录未找到，可能存在数据同步问题');
      setMessage({ type: 'error', text: '用户资料未找到，请重新注册或联系管理员' });

    } catch (error) {
      console.error('获取用户资料失败:', error);
      setMessage({ type: 'error', text: '获取用户资料失败，请检查网络连接' });
    }
  };

  // ================= 医生：获取患者列表 =================
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('doctor_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('获取患者列表失败:', error);
      setMessage({ type: 'error', text: '获取患者列表失败' });
    }
  };

  // ================= 患者：获取绑定的医生信息 =================
  const fetchDoctorInfo = async (doctorId) => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id,name,email,phone')
        .eq('id', doctorId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('获取医生信息失败:', error);
      return null;
    }
  };

  // ================= 患者：获取提交记录 =================
  const fetchSubmissions = async (patientId) => {
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('patient_id', patientId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('获取提交记录失败:', error);
      setMessage({ type: 'error', text: '获取提交记录失败' });
    }
  };

  // ================= 注册 =================
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            role: formData.role
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // 如果是医生，创建医生记录
        if (formData.role === 'doctor') {
          const { error: doctorInsertError } = await supabase
            .from('doctors')
            .insert([{
              id: data.user.id,
              name: formData.name,
              email: formData.email,
              phone: formData.phone
            }]);

          if (doctorInsertError) throw doctorInsertError;
        } else {
          // 创建患者记录
          let doctorId = null;

          // 如果患者提供了医生邀请码，验证并绑定医生
          if (formData.doctorInviteCode) {
            const { data: doctor, error: doctorError } = await supabase
              .from('doctors')
              .select('id')
              .eq('email', formData.doctorInviteCode)
              .single();

            if (doctorError) throw new Error('查找医生失败：' + doctorError.message);
            if (!doctor) throw new Error('邀请码无效，找不到对应医生');
            doctorId = doctor.id;
          }

          const { error: patientInsertError } = await supabase
            .from('patients')
            .insert([{
              id: data.user.id,
              name: formData.name,
              phone: formData.phone,
              doctor_id: doctorId
            }]);

          if (patientInsertError) throw patientInsertError;
        }

        setMessage({ type: 'success', text: '注册成功！请检查邮箱确认链接后登录。' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // ================= 登录 =================
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;
      setMessage({ type: 'success', text: '登录成功！' });
    } catch (error) {
      setMessage({ type: 'error', text: '登录失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // ================= 登出 =================
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUserRole(null);
      setUserProfile(null);
      setDoctorProfile(null);
      setCurrentView('dashboard');
      setFormData({
        email: '',
        password: '',
        name: '',
        phone: '',
        doctorInviteCode: '',
        role: 'patient'
      });
      window.history.replaceState({}, document.title, '/');
    } catch (error) {
      setMessage({ type: 'error', text: '登出失败' });
    } finally {
      setLoading(false);
    }
  };

  // ================= 患者提交症状 =================
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('form_submissions')
        .insert([{
          patient_id: session.user.id,
          symptom: symptom.trim()
        }]);

      if (error) throw error;

      setSymptom('');
      setMessage({ type: 'success', text: '症状提交成功！' });
      await fetchSubmissions(session.user.id);
    } catch (error) {
      setMessage({ type: 'error', text: '提交失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // ================= 生成绑定二维码 =================
  const generateBindingQr = async () => {
    setLoading(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

      const { error } = await supabase
        .from('binding_requests')
        .insert([{
          token,
          patient_id: session.user.id,
          expires_at: expiresAt.toISOString(),
          used: false
        }]);

      if (error) throw error;

      // 优先使用固定配置地址，避免同环境多应用时跳错站点
      const configuredBindBaseUrl = (process.env.REACT_APP_BIND_BASE_URL || '').trim();
      let bindUrl;

      if (configuredBindBaseUrl) {
        bindUrl = new URL(configuredBindBaseUrl);
      } else {
        // 回退到当前页面地址，确保与当前应用保持一致
        bindUrl = new URL(window.location.href);
      }

      bindUrl.searchParams.set('token', token);
      bindUrl.hash = '';
      const qrContent = bindUrl.toString();
      setQrToken(token);
      setQrExpiry(expiresAt.toLocaleString('zh-CN'));
      setQrCodeUrl(qrContent);
      setMessage({ type: 'success', text: '二维码生成成功！医生扫码后需先登录医生账号。' });
    } catch (error) {
      setMessage({ type: 'error', text: '生成二维码失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // ================= 医生扫码后确认绑定 =================
  const handleBindByToken = async () => {
    if (!session || userRole !== 'doctor') {
      setMessage({ type: 'error', text: '只有医生可以执行绑定操作' });
      return;
    }

    setLoading(true);
    try {
      // 查找有效的绑定请求
      const { data: request, error } = await supabase
        .from('binding_requests')
        .select('*')
        .eq('token', qrToken)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !request) {
        throw new Error('二维码无效或已过期');
      }

      // 更新患者绑定的医生
      const { data: patientRecord, error: patientError } = await supabase
        .from('patients')
        .select('id,doctor_id')
        .eq('id', request.patient_id)
        .single();

      if (patientError || !patientRecord) {
        throw new Error('患者记录不存在，无法完成绑定');
      }

      if (patientRecord.doctor_id && patientRecord.doctor_id !== session.user.id) {
        throw new Error('该患者已绑定其他医生，请先解绑后再重新绑定');
      }

      const { error: updateError } = await supabase
        .from('patients')
        .update({ doctor_id: session.user.id })
        .eq('id', request.patient_id);

      if (updateError) throw updateError;

      // 标记绑定请求为已使用
      await supabase
        .from('binding_requests')
        .update({ used: true })
        .eq('token', qrToken);

      setMessage({ type: 'success', text: '患者绑定成功！' });
      await fetchPatients();
      setCurrentView('dashboard');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // ================= 表单输入处理 =================
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ================= 加载状态 =================
  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  // ================= 未登录状态 =================
  if (!session) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-header">
            <h1>医患沟通平台</h1>
            <p>连接医生与患者，守护您的健康</p>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${currentView === 'login' ? 'active' : ''}`}
              onClick={() => setCurrentView('login')}
            >
              登录
            </button>
            <button
              className={`auth-tab ${currentView === 'register' ? 'active' : ''}`}
              onClick={() => setCurrentView('register')}
            >
              注册
            </button>
          </div>

          {currentView === 'register' && (
            <form className="auth-form" onSubmit={handleSignUp}>
              <h2>创建账户</h2>

              <div className="form-group">
                <label>身份类型</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  required
                >
                  <option value="patient">患者</option>
                  <option value="doctor">医生</option>
                </select>
              </div>

              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  placeholder="请输入邮箱"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>密码</label>
                <input
                  type="password"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>姓名</label>
                <input
                  type="text"
                  placeholder="请输入姓名"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>手机号</label>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>

              {formData.role === 'patient' && (
                <div className="form-group">
                  <label>医生邀请码（医生邮箱，可选）</label>
                  <input
                    type="email"
                    placeholder="请输入医生邮箱"
                    value={formData.doctorInviteCode}
                    onChange={(e) => handleInputChange('doctorInviteCode', e.target.value)}
                  />
                </div>
              )}

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? '注册中...' : '注册'}
              </button>
            </form>
          )}

          {currentView === 'login' && (
            <form className="auth-form" onSubmit={handleSignIn}>
              <h2>登录账户</h2>

              {qrToken && (
                <div className="bind-notice">
                  <p>🔗 您正在完成患者绑定</p>
                  <p>请使用<strong>医生账号</strong>登录以完成绑定</p>
                </div>
              )}

              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  placeholder="请输入邮箱"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>密码</label>
                <input
                  type="password"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? '登录中...' : qrToken ? '登录并绑定' : '登录'}
              </button>
            </form>
          )}

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= 绑定页面 =================
  if (currentView === 'bind') {
    return (
      <div className="app">
        <div className="bind-container">
          <h2>确认绑定患者</h2>
          <p>您即将绑定一位患者，绑定后可以查看该患者信息并进行沟通</p>

          <div className="bind-info">
            <div className="info-item">
              <span className="label">绑定令牌：</span>
              <span className="value">{qrToken}</span>
            </div>
            <div className="info-item">
              <span className="label">当前医生：</span>
              <span className="value">{userProfile?.name || session?.user?.email}</span>
            </div>
          </div>

          <div className="bind-actions">
            <button onClick={handleBindByToken} className="bind-button" disabled={loading}>
              {loading ? '绑定中...' : '确认绑定此患者'}
            </button>
            <button 
              onClick={() => {
                setCurrentView('dashboard');
                setQrToken('');
                window.history.replaceState({}, document.title, window.location.pathname);
              }} 
              className="cancel-button"
            >
              取消
            </button>
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= 已登录主界面 =================
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>医患沟通平台</h1>
          <div className="user-info">
            <span>欢迎，{userProfile?.name || session.user.email}</span>
            <span className="user-role">{userRole === 'doctor' ? '医生' : '患者'}</span>
            <button onClick={handleSignOut} className="logout-button">
              登出
            </button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          首页
        </button>
        {userRole === 'doctor' && (
          <button
            className={`nav-button ${currentView === 'patients' ? 'active' : ''}`}
            onClick={() => setCurrentView('patients')}
          >
            患者管理
          </button>
        )}
        {userRole === 'patient' && (
          <button
            className={`nav-button ${currentView === 'chat' ? 'active' : ''}`}
            onClick={() => setCurrentView('chat')}
            disabled={!userProfile?.doctor_id}
          >
            {userProfile?.doctor_id ? '与医生对话' : '未绑定医生'}
          </button>
        )}
        {selectedPatient && (
          <button
            className={`nav-button ${currentView === 'chat' ? 'active' : ''}`}
            onClick={() => setCurrentView('chat')}
          >
            与{selectedPatient.name}聊天
          </button>
        )}
      </nav>

      <main className="app-main">
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* 医生首页 */}
        {userRole === 'doctor' && currentView === 'dashboard' && (
          <div className="dashboard">
            <h2>医生控制台</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>患者数量</h3>
                <p className="stat-number">{patients.length}</p>
              </div>
              <div className="stat-card">
                <h3>今日咨询</h3>
                <p className="stat-number">0</p>
              </div>
            </div>
          </div>
        )}

        {/* 患者首页 */}
        {userRole === 'patient' && currentView === 'dashboard' && (
          <div className="dashboard">
            <h2>患者中心</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>绑定状态</h3>
                <p className="stat-number">{userProfile?.doctor_id ? '已绑定' : '未绑定'}</p>
              </div>
              <div className="stat-card">
                <h3>我的医生</h3>
                <p className="stat-number">{doctorProfile?.name || '暂无'}</p>
              </div>
            </div>
            <div className="quick-actions">
              <button onClick={() => setCurrentView('symptoms')} className="action-button">
                记录症状
              </button>
              <button onClick={generateBindingQr} className="action-button">
                {userProfile?.doctor_id ? '重新绑定医生' : '绑定医生'}
              </button>
            </div>

            {qrCodeUrl && (
              <div className="qr-display">
                <h3>绑定医生二维码</h3>
                <QRCode value={qrCodeUrl} size={200} />
                <p>有效期至：{qrExpiry}</p>
              </div>
            )}
          </div>
        )}

        {/* 患者管理 */}
        {userRole === 'doctor' && currentView === 'patients' && (
          <div className="patients-section">
            <h2>我的患者</h2>
            {patients.length === 0 ? (
              <div className="empty-state">
                <p>暂无患者</p>
                <p>患者可以通过扫描二维码与您绑定</p>
              </div>
            ) : (
              <div className="patients-grid">
                {patients.map(patient => (
                  <div key={patient.id} className="patient-card">
                    <div className="patient-info">
                      <h3>{patient.name}</h3>
                      <p>{patient.phone}</p>
                      <p>注册时间：{new Date(patient.created_at).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <div className="patient-actions">
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setCurrentView('chat');
                        }}
                        className="chat-button"
                      >
                        聊天
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 症状记录 */}
        {userRole === 'patient' && currentView === 'symptoms' && (
          <div className="symptoms-section">
            <div className="symptom-form">
              <h2>记录症状</h2>
              <form onSubmit={handleSubmitForm}>
                <div className="form-group">
                  <label>症状描述</label>
                  <textarea
                    placeholder="请详细描述您的症状..."
                    value={symptom}
                    onChange={(e) => setSymptom(e.target.value)}
                    rows="6"
                    required
                  />
                </div>
                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? '提交中...' : '提交症状'}
                </button>
              </form>
            </div>

            <div className="symptom-history">
              <h2>历史记录</h2>
              {submissions.length === 0 ? (
                <div className="empty-state">
                  <p>暂无症状记录</p>
                </div>
              ) : (
                <div className="submissions-list">
                  {submissions.map(submission => (
                    <div key={submission.id} className="submission-item">
                      <div className="submission-header">
                        <span className="submission-date">
                          {new Date(submission.submitted_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="submission-content">
                        {submission.symptom}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 聊天界面 */}
        {currentView === 'chat' && (
          <div className="chat-section">
            {userRole === 'doctor' && selectedPatient ? (
              <>
                <div className="chat-header">
                  <h2>与 {selectedPatient.name} 的对话</h2>
                  <button onClick={() => setCurrentView('patients')} className="back-button">
                    返回
                  </button>
                </div>
                <ChatWindow
                  currentUserId={session.user.id}
                  otherUserId={selectedPatient.id}
                  otherUserName={selectedPatient.name}
                />
              </>
            ) : userRole === 'patient' && userProfile?.doctor_id ? (
              <>
                <div className="chat-header">
                  <h2>与医生的对话</h2>
                  <button onClick={() => setCurrentView('dashboard')} className="back-button">
                    返回
                  </button>
                </div>
                <ChatWindow
                  currentUserId={session.user.id}
                  otherUserId={userProfile.doctor_id}
                  otherUserName={doctorProfile?.name || '医生'}
                />
              </>
            ) : (
              <div className="empty-state">
                <p>无法启动聊天</p>
                {userRole === 'patient' && !userProfile?.doctor_id && (
                  <p>请先绑定医生后再进行对话</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;