import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import ChatWindow from './ChatWindow';
import './App.css';

const ASSESSMENT_TEMPLATES = [
  {
    id: 'multi-system-assessment-20260204',
    title: '多系统功能评估表（D2）',
    description: '用于多系统功能评估，完成后可分配给患者查看。'
  }
];

const SCALE_OPTIONS = {
  nyha: [
    { value: 'I级', label: 'I级：无症状，体力活动正常' },
    { value: 'II级', label: 'II级：轻度活动受限，体力活动稍有不适' },
    { value: 'III级', label: 'III级：显著活动受限，日常活动困难' },
    { value: 'IV级', label: 'IV级：休息时症状，体力活动几乎无法进行' }
  ],
  mmrc: [
    { value: '0级', label: '0级：无呼吸困难（跑步/快走时才感到气短）' },
    { value: '1级', label: '1级：轻度呼吸困难（走较快或上坡时出现呼吸困难）' },
    { value: '2级', label: '2级：中度呼吸困难（平地上步伐变慢，需要休息）' },
    { value: '3级', label: '3级：重度呼吸困难（需要休息，经常停下喘气）' },
    { value: '4级', label: '4级：极度呼吸困难（无法完成日常活动，走几步就需要停下来）' }
  ],
  kdigo: [
    { value: 'I期', label: 'I期：eGFR轻度下降（≥1.5×基线）' },
    { value: 'II期', label: 'II期：eGFR中度下降（≥2.0×基线）' },
    { value: 'III期', label: 'III期：eGFR严重下降（≥3.0×基线，需透析）' },
    { value: 'IV期', label: 'IV期：急性肾衰竭（无恢复）' }
  ],
  mrs: [
    { value: '0级', label: '0级：无症状（神经系统恢复正常，无任何残疾）' },
    { value: '1级', label: '1级：轻度残疾（可能会有些轻微的运动障碍或语言障碍，但不影响独立生活）' },
    { value: '2级', label: '2级：轻度至中度残疾（步态问题或轻微运动不协调，可基本独立生活）' },
    { value: '3级', label: '3级：中度残疾（需要他人帮助完成基本生活活动）' },
    { value: '4级', label: '4级：重度残疾（几乎所有日常活动均需他人帮助）' },
    { value: '5级', label: '5级：重度依赖（完全失去日常活动能力，需24小时护理）' }
  ],
  nrs: [
    { value: 'NRS 0-2', label: 'NRS 0-2：无显著营养风险' },
    { value: 'NRS 3-4', label: 'NRS 3-4：轻度营养风险' },
    { value: 'NRS 5以上', label: 'NRS 5以上：中重度营养风险' }
  ]
};

const DEFAULT_ASSESSMENT_FORM = {
  basic: {
    name: '叶卓呈',
    gender: '男',
    age: '96岁',
    inpatientNo: '11848872',
    ward: '留观室',
    evaluationTime: '2026-02-04',
    phase: 'D2',
    phone: ''
  },
  cv: {
    functionGrade: 'II级',
    primaryDisease: '冠心病',
    specialties: ['心内科'],
    scale: 'II级'
  },
  resp: {
    functionGrade: '2级',
    primaryDisease: '胸腔积液',
    specialties: ['无'],
    scale: '2级'
  },
  renal: {
    functionGrade: '2期',
    primaryDisease: '肾功能不全',
    specialties: ['肾内科'],
    scale: 'III期'
  },
  neuro: {
    functionGrade: '4级',
    primaryDisease: '多发脑梗',
    specialties: ['无'],
    scale: '4级'
  },
  nutrition: {
    functionGrade: '6',
    primaryDisease: '营养不良、多发脑梗',
    specialties: ['营养科', '康复科'],
    scale: 'NRS 5以上'
  }
};

const createDefaultAssessmentForm = () => JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_FORM));

const renderCheckedLine = (selected, options) => options
  .map((option) => `${selected === option ? '☑' : '☐'} ${option}`)
  .join(' ');

const renderCheckedMultiLine = (selectedValues, options) => options
  .map((option) => `${(selectedValues || []).includes(option) ? '☑' : '☐'}${option}`)
  .join(' ');

const renderScaleLines = (selected, options) => options
  .map((item) => `${selected === item.value ? '☑' : '☐'} ${item.label}`)
  .join('\n');

const buildAssessmentContent = (form) => {
  const wardLine = renderCheckedLine(form.basic.ward, ['抢救室', '留观室', 'EICU', '急诊病房']);
  const phaseLine = renderCheckedLine(form.basic.phase, ['D2', '出院前']);

  return `患者基本信息
姓名：${form.basic.name}    性别：${form.basic.gender}    年龄：${form.basic.age}    住院号：${form.basic.inpatientNo}    ${wardLine}
评估时间：${form.basic.evaluationTime}    ${phaseLine}    联系电话：${form.basic.phone}

① 心血管系统（CV）
• 功能分级：${form.cv.functionGrade}
• 原发疾病：${form.cv.primaryDisease}
• 需要的专科介入：${renderCheckedMultiLine(form.cv.specialties, ['心内科', '康复科', '无'])}
NYHA分级（纽约心脏病分级）
${renderScaleLines(form.cv.scale, SCALE_OPTIONS.nyha)}

② 呼吸系统（Resp）
• 功能分级：${form.resp.functionGrade}
• 原发疾病：${form.resp.primaryDisease}
• 需要的专科介入：${renderCheckedMultiLine(form.resp.specialties, ['呼吸科', '康复科', '无'])}
MMRC量表
${renderScaleLines(form.resp.scale, SCALE_OPTIONS.mmrc)}

③ 肾功能（Renal）
• 功能分级：${form.renal.functionGrade}
• 原发疾病：${form.renal.primaryDisease}
• 需要的专科介入：${renderCheckedMultiLine(form.renal.specialties, ['肾内科', '康复科', '无'])}
KDIGO标准（急性肾损伤分期）
${renderScaleLines(form.renal.scale, SCALE_OPTIONS.kdigo)}

④ 神经系统（Neuro）
• 功能分级：${form.neuro.functionGrade}
• 原发疾病：${form.neuro.primaryDisease}
• 需要的专科介入：${renderCheckedMultiLine(form.neuro.specialties, ['神经内科', '康复科', '无'])}
MRS评分
${renderScaleLines(form.neuro.scale, SCALE_OPTIONS.mrs)}

⑤ 营养（Nutrition）
• 功能分级：${form.nutrition.functionGrade}
• 原发疾病：${form.nutrition.primaryDisease}
• 需要的专科介入：${renderCheckedMultiLine(form.nutrition.specialties, ['营养科', '康复科', '无'])}
NRS2002评分（营养风险筛查）
${renderScaleLines(form.nutrition.scale, SCALE_OPTIONS.nrs)}`;
};

const cloneAssessmentForm = (form) => JSON.parse(JSON.stringify(form));

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
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState(createDefaultAssessmentForm());
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [editingSavedAssessmentId, setEditingSavedAssessmentId] = useState(null);
  const [savedAssessments, setSavedAssessments] = useState([]);
  const [savedAssignPatientMap, setSavedAssignPatientMap] = useState({});
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
        await fetchSavedAssessments(userId);
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

  const fetchSavedAssessments = async (doctorId) => {
    if (!doctorId) {
      setSavedAssessments([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assessment_drafts')
        .select('id, template_id, title, form_data, created_at, updated_at')
        .eq('doctor_id', doctorId)
        .order('updated_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setMessage({ type: 'error', text: '评估草稿表尚未创建，请先执行 sql/assessment_drafts.sql。' });
          setSavedAssessments([]);
          return;
        }
        throw error;
      }

      const mapped = (data || []).map((item) => ({
        id: item.id,
        templateId: item.template_id,
        title: item.title,
        formData: item.form_data,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      setSavedAssessments(mapped);
      setSavedAssignPatientMap({});
    } catch (error) {
      console.error('获取评估草稿失败:', error);
      setMessage({ type: 'error', text: '获取评估保存列表失败：' + error.message });
      setSavedAssessments([]);
    }
  };

  useEffect(() => {
    if (userRole !== 'doctor' || !session?.user?.id) {
      setSavedAssessments([]);
      setSavedAssignPatientMap({});
      return;
    }

    fetchSavedAssessments(session.user.id);
  }, [userRole, session?.user?.id]);

  const handleStartAssessment = (assessmentTemplate) => {
    setSelectedAssessment(assessmentTemplate);
    setAssessmentForm(createDefaultAssessmentForm());
    setAssessmentCompleted(false);
    setEditingSavedAssessmentId(null);
    setCurrentView('assessmentDetail');
    setMessage({ type: '', text: '' });
  };

  const handleEditSavedAssessment = (savedItem) => {
    const template = ASSESSMENT_TEMPLATES.find((item) => item.id === savedItem.templateId) || ASSESSMENT_TEMPLATES[0];
    setSelectedAssessment(template);
    setAssessmentForm(cloneAssessmentForm(savedItem.formData || createDefaultAssessmentForm()));
    setAssessmentCompleted(true);
    setEditingSavedAssessmentId(savedItem.id);
    setCurrentView('assessmentDetail');
    setMessage({ type: '', text: '' });
  };

  const handleAssessmentBasicChange = (field, value) => {
    setAssessmentForm((prev) => ({
      ...prev,
      basic: {
        ...prev.basic,
        [field]: value
      }
    }));
    setAssessmentCompleted(false);
  };

  const handleAssessmentSystemChange = (systemKey, field, value) => {
    setAssessmentForm((prev) => ({
      ...prev,
      [systemKey]: {
        ...prev[systemKey],
        [field]: value
      }
    }));
    setAssessmentCompleted(false);
  };

  const handleAssessmentSpecialtyToggle = (systemKey, specialty) => {
    setAssessmentForm((prev) => {
      const currentSpecialties = prev[systemKey].specialties || [];
      const hasSpecialty = currentSpecialties.includes(specialty);
      let nextSpecialties;

      if (specialty === '无') {
        nextSpecialties = hasSpecialty ? [] : ['无'];
      } else if (hasSpecialty) {
        nextSpecialties = currentSpecialties.filter((item) => item !== specialty);
      } else {
        nextSpecialties = [...currentSpecialties.filter((item) => item !== '无'), specialty];
      }

      return {
        ...prev,
        [systemKey]: {
          ...prev[systemKey],
          specialties: nextSpecialties
        }
      };
    });
    setAssessmentCompleted(false);
  };

  const handleCompleteAssessment = () => {
    setAssessmentCompleted(true);
    setMessage({ type: 'success', text: '评估已完成，请先保存到列表。' });
  };

  const handleSaveAssessment = async () => {
    if (!selectedAssessment) {
      setMessage({ type: 'error', text: '请先选择评估表单。' });
      return;
    }
    if (!assessmentCompleted) {
      setMessage({ type: 'error', text: '请先点击“评估完成”。' });
      return;
    }

    try {
      const payload = {
        doctor_id: session.user.id,
        template_id: selectedAssessment.id,
        title: selectedAssessment.title,
        form_data: cloneAssessmentForm(assessmentForm)
      };

      let savedRow = null;

      if (editingSavedAssessmentId) {
        const { data, error } = await supabase
          .from('assessment_drafts')
          .update(payload)
          .eq('id', editingSavedAssessmentId)
          .eq('doctor_id', session.user.id)
          .select('id, template_id, title, form_data, created_at, updated_at')
          .single();

        if (error) throw error;
        savedRow = data;
      } else {
        const { data, error } = await supabase
          .from('assessment_drafts')
          .insert([payload])
          .select('id, template_id, title, form_data, created_at, updated_at')
          .single();

        if (error) throw error;
        savedRow = data;
      }

      const mappedSaved = {
        id: savedRow.id,
        templateId: savedRow.template_id,
        title: savedRow.title,
        formData: savedRow.form_data,
        createdAt: savedRow.created_at,
        updatedAt: savedRow.updated_at
      };

      setSavedAssessments((prev) => {
        if (editingSavedAssessmentId) {
          return prev.map((item) => (item.id === editingSavedAssessmentId ? mappedSaved : item));
        }
        return [mappedSaved, ...prev];
      });

      setMessage({ type: 'success', text: editingSavedAssessmentId ? '评估已更新并保存到云端列表。' : '评估已保存到云端列表。' });
      setCurrentView('assessmentList');
      setSelectedAssessment(null);
      setAssessmentForm(createDefaultAssessmentForm());
      setAssessmentCompleted(false);
      setEditingSavedAssessmentId(null);
    } catch (error) {
      setMessage({ type: 'error', text: '保存评估失败：' + error.message });
    }
  };

  const handleSavedAssignPatientChange = (savedId, patientId) => {
    setSavedAssignPatientMap((prev) => ({
      ...prev,
      [savedId]: patientId
    }));
  };

  const handleDeleteSavedAssessment = async (savedId) => {
    const savedItem = savedAssessments.find((item) => item.id === savedId);
    if (!savedItem) {
      setMessage({ type: 'error', text: '未找到待删除评估。' });
      return;
    }

    const confirmed = window.confirm(`确认删除评估「${savedItem.title}」吗？删除后不可恢复。`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('assessment_drafts')
        .delete()
        .eq('id', savedId)
        .eq('doctor_id', session.user.id);

      if (error) throw error;

      setSavedAssessments((prev) => prev.filter((item) => item.id !== savedId));
      setSavedAssignPatientMap((prev) => {
        const next = { ...prev };
        delete next[savedId];
        return next;
      });
      if (editingSavedAssessmentId === savedId) {
        setEditingSavedAssessmentId(null);
        setSelectedAssessment(null);
        setAssessmentForm(createDefaultAssessmentForm());
        setAssessmentCompleted(false);
        setCurrentView('assessmentList');
      }
      setMessage({ type: 'success', text: '评估已删除。' });
    } catch (error) {
      setMessage({ type: 'error', text: '删除评估失败：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSavedAssessment = async (savedId) => {
    const savedItem = savedAssessments.find((item) => item.id === savedId);
    if (!savedItem) {
      setMessage({ type: 'error', text: '未找到保存的评估记录。' });
      return;
    }
    const patientId = savedAssignPatientMap[savedId];
    if (!patientId) {
      setMessage({ type: 'error', text: '请选择要分配的患者。' });
      return;
    }

    setLoading(true);
    try {
      const targetPatient = patients.find((patient) => patient.id === patientId);
      const assessmentText = [
        `【医生评估】${savedItem.title}`,
        `评估医生：${userProfile?.name || session?.user?.email || '医生'}`,
        `分配患者：${targetPatient?.name || '未命名患者'}`,
        `评估保存时间：${new Date(savedItem.updatedAt || savedItem.createdAt).toLocaleString('zh-CN')}`,
        `分配时间：${new Date().toLocaleString('zh-CN')}`,
        '',
        buildAssessmentContent(savedItem.formData)
      ].join('\n');

      const { error } = await supabase
        .from('form_submissions')
        .insert([
          {
            patient_id: patientId,
            symptom: assessmentText
          }
        ]);

      if (error) throw error;

      setMessage({ type: 'success', text: `评估表已成功分配给患者：${targetPatient?.name || ''}` });
      setSavedAssignPatientMap((prev) => ({
        ...prev,
        [savedId]: ''
      }));
    } catch (error) {
      setMessage({ type: 'error', text: '分配评估失败：' + error.message });
    } finally {
      setLoading(false);
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
      setSavedAssessments([]);
      setSavedAssignPatientMap({});
      setEditingSavedAssessmentId(null);
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
      const appBasePath = (process.env.PUBLIC_URL || '').trim();
      let bindUrl;

      if (configuredBindBaseUrl) {
        bindUrl = new URL(configuredBindBaseUrl);
        // 若仅配置了域名根路径，自动补齐当前应用子路径（如 /doctor-platform）
        if ((!bindUrl.pathname || bindUrl.pathname === '/') && appBasePath) {
          bindUrl.pathname = appBasePath.startsWith('/') ? appBasePath : `/${appBasePath}`;
        }
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
        {userRole === 'doctor' && (
          <button
            className={`nav-button ${currentView === 'assessmentList' || currentView === 'assessmentDetail' ? 'active' : ''}`}
            onClick={() => setCurrentView('assessmentList')}
          >
            评估列表
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
        {userRole === 'patient' && (
          <button
            className={`nav-button ${currentView === 'patientAssessments' ? 'active' : ''}`}
            onClick={() => setCurrentView('patientAssessments')}
          >
            医生评估表
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

        {/* 医生评估列表 */}
        {userRole === 'doctor' && currentView === 'assessmentList' && (
          <div className="assessment-list-section">
            <h2>评估列表</h2>
            <div className="assessment-list">
              {ASSESSMENT_TEMPLATES.map((template) => (
                <div key={template.id} className="assessment-card">
                  <h3>{template.title}</h3>
                  <p>{template.description}</p>
                  <button
                    className="action-button"
                    onClick={() => handleStartAssessment(template)}
                  >
                    开始评估
                  </button>
                </div>
              ))}
            </div>

            <div className="saved-assessment-section">
              <h3>已保存评估</h3>
              {savedAssessments.length === 0 ? (
                <div className="empty-state">
                  <p>暂无已保存评估</p>
                  <p>请先完成评估并保存</p>
                </div>
              ) : (
                <div className="saved-assessment-list">
                  {savedAssessments.map((savedItem) => (
                    <div key={savedItem.id} className="saved-assessment-card">
                      <div className="saved-assessment-meta">
                        <h4>{savedItem.title}</h4>
                        <p>患者姓名：{savedItem.formData?.basic?.name || '未填写'}</p>
                        <p>更新时间：{new Date(savedItem.updatedAt || savedItem.createdAt).toLocaleString('zh-CN')}</p>
                      </div>

                      <div className="saved-assessment-actions">
                        <button
                          className="chat-button"
                          onClick={() => handleEditSavedAssessment(savedItem)}
                        >
                          编辑
                        </button>

                        <select
                          value={savedAssignPatientMap[savedItem.id] || ''}
                          onChange={(e) => handleSavedAssignPatientChange(savedItem.id, e.target.value)}
                        >
                          <option value="">请选择患者后分配</option>
                          {patients.map((patient) => (
                            <option key={patient.id} value={patient.id}>
                              {patient.name}（{patient.phone || '无手机号'}）
                            </option>
                          ))}
                        </select>

                        <button
                          className="action-button"
                          onClick={() => handleAssignSavedAssessment(savedItem.id)}
                          disabled={!savedAssignPatientMap[savedItem.id] || loading}
                        >
                          {loading ? '分配中...' : '分配给患者'}
                        </button>

                        <button
                          className="delete-button"
                          onClick={() => handleDeleteSavedAssessment(savedItem.id)}
                          disabled={loading}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 医生评估详情 */}
        {userRole === 'doctor' && currentView === 'assessmentDetail' && selectedAssessment && (
          <div className="assessment-detail-section">
            <div className="assessment-detail-header">
              <h2>{selectedAssessment.title}</h2>
              <button
                onClick={() => {
                  setCurrentView('assessmentList');
                  setSelectedAssessment(null);
                  setAssessmentCompleted(false);
                  setAssessmentForm(createDefaultAssessmentForm());
                  setEditingSavedAssessmentId(null);
                }}
                className="back-button"
              >
                返回评估列表
              </button>
            </div>

            <div className="assessment-content-card">
              <h3>患者基本信息</h3>
              <div className="assessment-form-grid">
                <div className="form-group">
                  <label>姓名</label>
                  <input
                    type="text"
                    value={assessmentForm.basic.name}
                    onChange={(e) => handleAssessmentBasicChange('name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>性别</label>
                  <input
                    type="text"
                    value={assessmentForm.basic.gender}
                    onChange={(e) => handleAssessmentBasicChange('gender', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>年龄</label>
                  <input
                    type="text"
                    value={assessmentForm.basic.age}
                    onChange={(e) => handleAssessmentBasicChange('age', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>住院号</label>
                  <input
                    type="text"
                    value={assessmentForm.basic.inpatientNo}
                    onChange={(e) => handleAssessmentBasicChange('inpatientNo', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>评估时间</label>
                  <input
                    type="date"
                    value={assessmentForm.basic.evaluationTime}
                    onChange={(e) => handleAssessmentBasicChange('evaluationTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>联系电话</label>
                  <input
                    type="text"
                    value={assessmentForm.basic.phone}
                    onChange={(e) => handleAssessmentBasicChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="assessment-option-group">
                <label>病区</label>
                <div className="assessment-option-items">
                  {['抢救室', '留观室', 'EICU', '急诊病房'].map((ward) => (
                    <label key={ward} className="assessment-option-item">
                      <input
                        type="radio"
                        name="ward"
                        checked={assessmentForm.basic.ward === ward}
                        onChange={() => handleAssessmentBasicChange('ward', ward)}
                      />
                      <span>{ward}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="assessment-option-group">
                <label>评估阶段</label>
                <div className="assessment-option-items">
                  {['D2', '出院前'].map((phase) => (
                    <label key={phase} className="assessment-option-item">
                      <input
                        type="radio"
                        name="phase"
                        checked={assessmentForm.basic.phase === phase}
                        onChange={() => handleAssessmentBasicChange('phase', phase)}
                      />
                      <span>{phase}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="assessment-system-card">
                <h3>① 心血管系统（CV）</h3>
                <div className="assessment-form-grid">
                  <div className="form-group">
                    <label>功能分级</label>
                    <input
                      type="text"
                      value={assessmentForm.cv.functionGrade}
                      onChange={(e) => handleAssessmentSystemChange('cv', 'functionGrade', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>原发疾病</label>
                    <input
                      type="text"
                      value={assessmentForm.cv.primaryDisease}
                      onChange={(e) => handleAssessmentSystemChange('cv', 'primaryDisease', e.target.value)}
                    />
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>需要的专科介入</label>
                  <div className="assessment-option-items">
                    {['心内科', '康复科', '无'].map((item) => (
                      <label key={item} className="assessment-option-item">
                        <input
                          type="checkbox"
                          checked={assessmentForm.cv.specialties.includes(item)}
                          onChange={() => handleAssessmentSpecialtyToggle('cv', item)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>NYHA分级（纽约心脏病分级）</label>
                  <div className="assessment-option-column">
                    {SCALE_OPTIONS.nyha.map((item) => (
                      <label key={item.value} className="assessment-option-item">
                        <input
                          type="radio"
                          name="cv-scale"
                          checked={assessmentForm.cv.scale === item.value}
                          onChange={() => handleAssessmentSystemChange('cv', 'scale', item.value)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="assessment-system-card">
                <h3>② 呼吸系统（Resp）</h3>
                <div className="assessment-form-grid">
                  <div className="form-group">
                    <label>功能分级</label>
                    <input
                      type="text"
                      value={assessmentForm.resp.functionGrade}
                      onChange={(e) => handleAssessmentSystemChange('resp', 'functionGrade', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>原发疾病</label>
                    <input
                      type="text"
                      value={assessmentForm.resp.primaryDisease}
                      onChange={(e) => handleAssessmentSystemChange('resp', 'primaryDisease', e.target.value)}
                    />
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>需要的专科介入</label>
                  <div className="assessment-option-items">
                    {['呼吸科', '康复科', '无'].map((item) => (
                      <label key={item} className="assessment-option-item">
                        <input
                          type="checkbox"
                          checked={assessmentForm.resp.specialties.includes(item)}
                          onChange={() => handleAssessmentSpecialtyToggle('resp', item)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>MMRC量表</label>
                  <div className="assessment-option-column">
                    {SCALE_OPTIONS.mmrc.map((item) => (
                      <label key={item.value} className="assessment-option-item">
                        <input
                          type="radio"
                          name="resp-scale"
                          checked={assessmentForm.resp.scale === item.value}
                          onChange={() => handleAssessmentSystemChange('resp', 'scale', item.value)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="assessment-system-card">
                <h3>③ 肾功能（Renal）</h3>
                <div className="assessment-form-grid">
                  <div className="form-group">
                    <label>功能分级</label>
                    <input
                      type="text"
                      value={assessmentForm.renal.functionGrade}
                      onChange={(e) => handleAssessmentSystemChange('renal', 'functionGrade', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>原发疾病</label>
                    <input
                      type="text"
                      value={assessmentForm.renal.primaryDisease}
                      onChange={(e) => handleAssessmentSystemChange('renal', 'primaryDisease', e.target.value)}
                    />
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>需要的专科介入</label>
                  <div className="assessment-option-items">
                    {['肾内科', '康复科', '无'].map((item) => (
                      <label key={item} className="assessment-option-item">
                        <input
                          type="checkbox"
                          checked={assessmentForm.renal.specialties.includes(item)}
                          onChange={() => handleAssessmentSpecialtyToggle('renal', item)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>KDIGO标准（急性肾损伤分期）</label>
                  <div className="assessment-option-column">
                    {SCALE_OPTIONS.kdigo.map((item) => (
                      <label key={item.value} className="assessment-option-item">
                        <input
                          type="radio"
                          name="renal-scale"
                          checked={assessmentForm.renal.scale === item.value}
                          onChange={() => handleAssessmentSystemChange('renal', 'scale', item.value)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="assessment-system-card">
                <h3>④ 神经系统（Neuro）</h3>
                <div className="assessment-form-grid">
                  <div className="form-group">
                    <label>功能分级</label>
                    <input
                      type="text"
                      value={assessmentForm.neuro.functionGrade}
                      onChange={(e) => handleAssessmentSystemChange('neuro', 'functionGrade', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>原发疾病</label>
                    <input
                      type="text"
                      value={assessmentForm.neuro.primaryDisease}
                      onChange={(e) => handleAssessmentSystemChange('neuro', 'primaryDisease', e.target.value)}
                    />
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>需要的专科介入</label>
                  <div className="assessment-option-items">
                    {['神经内科', '康复科', '无'].map((item) => (
                      <label key={item} className="assessment-option-item">
                        <input
                          type="checkbox"
                          checked={assessmentForm.neuro.specialties.includes(item)}
                          onChange={() => handleAssessmentSpecialtyToggle('neuro', item)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>MRS评分</label>
                  <div className="assessment-option-column">
                    {SCALE_OPTIONS.mrs.map((item) => (
                      <label key={item.value} className="assessment-option-item">
                        <input
                          type="radio"
                          name="neuro-scale"
                          checked={assessmentForm.neuro.scale === item.value}
                          onChange={() => handleAssessmentSystemChange('neuro', 'scale', item.value)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="assessment-system-card">
                <h3>⑤ 营养（Nutrition）</h3>
                <div className="assessment-form-grid">
                  <div className="form-group">
                    <label>功能分级</label>
                    <input
                      type="text"
                      value={assessmentForm.nutrition.functionGrade}
                      onChange={(e) => handleAssessmentSystemChange('nutrition', 'functionGrade', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>原发疾病</label>
                    <input
                      type="text"
                      value={assessmentForm.nutrition.primaryDisease}
                      onChange={(e) => handleAssessmentSystemChange('nutrition', 'primaryDisease', e.target.value)}
                    />
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>需要的专科介入</label>
                  <div className="assessment-option-items">
                    {['营养科', '康复科', '无'].map((item) => (
                      <label key={item} className="assessment-option-item">
                        <input
                          type="checkbox"
                          checked={assessmentForm.nutrition.specialties.includes(item)}
                          onChange={() => handleAssessmentSpecialtyToggle('nutrition', item)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="assessment-option-group">
                  <label>NRS2002评分（营养风险筛查）</label>
                  <div className="assessment-option-column">
                    {SCALE_OPTIONS.nrs.map((item) => (
                      <label key={item.value} className="assessment-option-item">
                        <input
                          type="radio"
                          name="nutrition-scale"
                          checked={assessmentForm.nutrition.scale === item.value}
                          onChange={() => handleAssessmentSystemChange('nutrition', 'scale', item.value)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="assessment-actions">
              <button
                className="submit-button"
                onClick={handleCompleteAssessment}
                disabled={assessmentCompleted}
              >
                {assessmentCompleted ? '已完成评估' : '评估完成'}
              </button>

              <button
                className="action-button"
                onClick={handleSaveAssessment}
                disabled={!assessmentCompleted}
              >
                {editingSavedAssessmentId ? '更新保存到列表' : '保存到列表'}
              </button>
            </div>
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

        {/* 患者查看医生分配评估 */}
        {userRole === 'patient' && currentView === 'patientAssessments' && (
          <div className="patient-assessment-section">
            <h2>医生分配的评估表</h2>
            {submissions.filter(item => item.symptom?.startsWith('【医生评估】')).length === 0 ? (
              <div className="empty-state">
                <p>暂无医生分配的评估表</p>
                <p>医生分配后会显示在这里</p>
              </div>
            ) : (
              <div className="submissions-list">
                {submissions
                  .filter(item => item.symptom?.startsWith('【医生评估】'))
                  .map((submission) => (
                    <div key={submission.id} className="submission-item assessment-item">
                      <div className="submission-header">
                        <span className="submission-date">
                          {new Date(submission.submitted_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <pre className="submission-content assessment-content">{submission.symptom}</pre>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;