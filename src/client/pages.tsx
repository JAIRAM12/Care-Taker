import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  List,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { api, dashboardPath, post, type SessionUser } from "./api";
import { useAuth } from "./auth";

const { Title, Text, Paragraph } = Typography;

function Brand({ light = false }: { light?: boolean }) {
  return <span className={`brand${light ? " brand-light" : ""}`}><span className="brand-icon"><HeartOutlined /></span>CareConnect</span>;
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="auth-wrap"><section className="auth-card"><Link to="/" aria-label="CareConnect home"><Brand /></Link><Title level={2} className="auth-title">{title}</Title><Paragraph className="muted auth-subtitle">{subtitle}</Paragraph>{children}</section></main>;
}

export function LandingPage() {
  return (
    <main className="app-public">
      <header className="public-header"><Link to="/" aria-label="CareConnect home"><Brand /></Link><Space><Button type="text" href="/login">Log in</Button><Button type="primary" href="/register">Get started</Button></Space></header>
      <section className="hero">
        <div>
          <Tag color="green" icon={<SafetyCertificateOutlined />}>Care coordination, made clearer</Tag>
          <Title className="hero-title">Trusted care and household support, managed from one place.</Title>
          <Paragraph className="hero-copy">Find the right support, keep schedules organized, and stay connected through every step of care.</Paragraph>
          <Space wrap size="middle" className="hero-actions"><Button type="primary" size="large" href="/register" icon={<ArrowRightOutlined />}>Get started</Button><Button size="large" href="/login">Agency staff sign in</Button></Space>
          <Text className="muted hero-footnote">Customers can sign up online. Agency staff onboard caregivers.</Text>
        </div>
        <div className="hero-preview">
          <Card className="preview-card" bordered={false}>
            <Space className="preview-greeting" align="center"><Avatar style={{ background: "#f4ece0", color: "#6c4d25" }}>M</Avatar><div><Text type="secondary">Your care overview</Text><Title level={4} style={{ margin: "3px 0 0" }}>Good morning, Maya</Title></div></Space>
            <Card size="small" className="visit-card" title="Upcoming visit" extra={<Tag color="green">Confirmed</Tag>}>
              <Title level={5} style={{ marginTop: 0 }}>Home assistance</Title><Text type="secondary"><CalendarOutlined /> &nbsp;Tuesday · 9:00 AM</Text>
              <Divider style={{ margin: "16px 0" }} />
              <Space><Avatar style={{ background: "#eaf5ef", color: "#246b50" }}>A</Avatar><div><Text strong>Anika Sharma</Text><br /><Text type="secondary">Caregiver · Documents reviewed</Text></div><SafetyCertificateOutlined style={{ color: "#246b50", fontSize: 19 }} /></Space>
            </Card>
            <Row gutter={12}><Col span={12}><Card size="small"><Text type="secondary">Today’s tasks</Text><Title level={3} style={{ margin: "7px 0 0" }}>3 <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>planned</Text></Title></Card></Col><Col span={12}><Card size="small"><Text type="secondary">Care updates</Text><p style={{ margin: "9px 0 0" }}><Badge status="success" text="All caught up" /></p></Card></Col></Row>
          </Card>
          <div className="preview-footer"><CheckCircleOutlined /> Care details and updates, together in one simple space.</div>
        </div>
      </section>
      <section className="section-wrap">
        <div className="section-heading"><Text strong type="success">HOW IT WORKS</Text><Title level={2}>Support that stays organized</Title></div>
        <Row gutter={[18, 18]}>
          {["Share what you need", "Coordinate with a manager", "Stay in the loop"].map((title, index) => (
            <Col xs={24} md={8} key={title}><Card className="feature-card"><Text strong type="success">0{index + 1}</Text><Title level={4}>{title}</Title><Paragraph className="muted">{[
              "Tell us about your family member, preferred schedule, and the kind of support you’re looking for.",
              "A care manager reviews your request and matches it with an eligible caregiver.",
              "Follow assignments, tasks, attendance, and service feedback from your dashboard.",
            ][index]}</Paragraph></Card></Col>
          ))}
        </Row>
        <Space wrap className="service-tags">{["Elder companionship", "Daily home support", "Meal preparation", "Mobility assistance"].map((service) => <Tag key={service} bordered>{service}</Tag>)}</Space>
        <Text type="secondary">CareConnect coordinates home services. It does not provide medical advice or guarantee service outcomes.</Text>
      </section>
    </main>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [developmentMode, setDevelopmentMode] = useState(false);
  const [developmentCode, setDevelopmentCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(values: { phone: string }) {
    setBusy(true); setError("");
    try {
      const result = await post<{ challengeId: string; developmentMode?: boolean; developmentCode?: string }>("/api/auth/login", {
        action: "request", phone: values.phone, purpose: "LOGIN",
      });
      setPhone(values.phone.trim());
      setChallengeId(result.challengeId);
      setDevelopmentMode(Boolean(result.developmentMode));
      setDevelopmentCode(result.developmentCode || "");
      setStage("code");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send a sign-in code.");
    } finally { setBusy(false); }
  }

  async function verifyCode(values: { code: string }) {
    setBusy(true); setError("");
    try {
      const result = await post<{ redirect?: string }>("/api/auth/login", {
        action: "verify", phone, code: values.code, challengeId,
      });
      const user = await refresh();
      navigate(result.redirect || dashboardPath(user?.role ?? "CUSTOMER"), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed. Request a new code and try again.");
    } finally { setBusy(false); }
  }

  return <AuthFrame title="Sign in with your phone" subtitle="We’ll text a one-time code to verify it’s you.">
    {stage === "phone" ? <Form layout="vertical" onFinish={sendCode} requiredMark={false}>
      <Form.Item label="Mobile number" name="phone" rules={[{ required: true }, { pattern: /^\+[1-9]\d{7,14}$/, message: "Include + and your country code, for example +91." }]}>
        <Input size="large" autoComplete="tel" inputMode="tel" placeholder="+919876543210" />
      </Form.Item>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Button htmlType="submit" type="primary" size="large" block loading={busy}>Send sign-in code</Button>
    </Form> : <>
      <Alert type="info" showIcon message={developmentMode ? "Local development code: " + developmentCode : "Enter the six-digit code sent to " + phone} style={{ marginBottom: 20 }} />
      <Form layout="vertical" onFinish={verifyCode} requiredMark={false}>
        <Form.Item label="Verification code" name="code" rules={[{ required: true }, { pattern: /^\d{6}$/, message: "Enter the six-digit code." }]}>
          <Input size="large" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" />
        </Form.Item>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Button htmlType="submit" type="primary" size="large" block loading={busy}>Verify and sign in</Button>
      </Form>
      <Button type="link" onClick={() => { setStage("phone"); setError(""); }}>Use a different number</Button>
    </>}
    <Divider plain>New customer?</Divider>
    <Button block href="/register">Create a customer account</Button>
    <Paragraph className="muted" style={{ marginTop: 16, marginBottom: 0 }}>
      Caregivers and agency staff sign in with the number linked to their account. Contact your agency administrator if your number needs to be added.
    </Paragraph>
  </AuthFrame>;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [stage, setStage] = useState<"profile" | "code">("profile");
  const [profile, setProfile] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [developmentMode, setDevelopmentMode] = useState(false);
  const [developmentCode, setDevelopmentCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(values: { name: string; email: string; phone: string }) {
    setBusy(true); setError("");
    try {
      const result = await post<{ challengeId: string; developmentMode?: boolean; developmentCode?: string }>("/api/auth/login", {
        action: "request", phone: values.phone, purpose: "REGISTER",
      });
      setProfile({ name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() });
      setChallengeId(result.challengeId);
      setDevelopmentMode(Boolean(result.developmentMode));
      setDevelopmentCode(result.developmentCode || "");
      setStage("code");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send a verification code.");
    } finally { setBusy(false); }
  }

  async function verifyAndRegister(values: { code: string }) {
    if (!profile) return;
    setBusy(true); setError("");
    try {
      const result = await post<{ redirect: string }>("/api/auth/register", {
        ...profile, code: values.code, challengeId,
      });
      await refresh();
      navigate(result.redirect, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your account.");
    } finally { setBusy(false); }
  }

  return <AuthFrame title="Create your customer account" subtitle="Verify your mobile number to get started with CareConnect.">
    {stage === "profile" ? <Form layout="vertical" onFinish={sendCode} requiredMark={false}>
      <Form.Item label="Full name" name="name" rules={[{ required: true }, { min: 2, max: 80 }]}><Input size="large" autoComplete="name" /></Form.Item>
      <Form.Item label="Email address" name="email" rules={[{ required: true }, { type: "email", max: 254 }]}><Input size="large" autoComplete="email" /></Form.Item>
      <Form.Item label="Mobile number" name="phone" rules={[{ required: true }, { pattern: /^\+[1-9]\d{7,14}$/, message: "Enter the number without spaces, with + and country code, for example +919876543210." }]}><Input size="large" autoComplete="tel" inputMode="tel" placeholder="+919876543210" /></Form.Item>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Button htmlType="submit" type="primary" size="large" block loading={busy}>Send verification code</Button>
    </Form> : <>
      <Alert type="info" showIcon message={developmentMode ? "Local development code: " + developmentCode : "Enter the six-digit code sent to " + (profile?.phone ?? "")} style={{ marginBottom: 20 }} />
      <Form layout="vertical" onFinish={verifyAndRegister} requiredMark={false}>
        <Form.Item label="Verification code" name="code" rules={[{ required: true }, { pattern: /^\d{6}$/, message: "Enter the six-digit code." }]}>
          <Input size="large" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" />
        </Form.Item>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Button htmlType="submit" type="primary" size="large" block loading={busy}>Verify and create account</Button>
      </Form>
      <Button type="link" onClick={() => { setStage("profile"); setError(""); }}>Change details or number</Button>
    </>}
    <p className="auth-tail">Already registered? <Link to="/login">Sign in with your phone</Link></p>
    <Paragraph className="muted" style={{ marginBottom: 0 }}>Caregiver and agency accounts are created or linked by the agency; they cannot be created from customer sign-up.</Paragraph>
  </AuthFrame>;
}

export function ForgotPasswordPage() {
  return <AuthFrame title="Sign-in codes" subtitle="CareConnect signs in with a one-time code sent to your mobile number.">
    <Alert type="info" showIcon message="No password reset is needed." description="Return to sign in and request a new phone verification code." />
    <Button type="primary" block href="/login" style={{ marginTop: 18 }}>Sign in with your phone</Button>
  </AuthFrame>;
}

export function ResetPasswordPage() {
  return <AuthFrame title="Password sign-in is unavailable" subtitle="Use a one-time code sent to your registered phone instead.">
    <Button type="primary" block href="/login">Go to phone sign-in</Button>
  </AuthFrame>;
}

type Summary = {
  metrics: { requests: number; availableCaregivers: number; assignments: number; openComplaints: number };
  tasks: Array<{ id: string; title: string; status: string; dueAt: string | null; assignment: { request: { service: { name: string } } } }>;
  notifications: Array<{ id: string; title: string; message: string; createdAt: string }>;
  caregiverStatus: string | null;
  managerQueue: Array<{ id: string; status: string; location: string; preferredDate: string; service: { name: string }; customer: { name: string } }>;
  availableMaids: Array<{ id: string; name: string }>;
};

const initialSummary: Summary = { metrics: { requests: 0, availableCaregivers: 0, assignments: 0, openComplaints: 0 }, tasks: [], notifications: [], caregiverStatus: null, managerQueue: [], availableMaids: [] };

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const { data = initialSummary, isPending: loading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-summary", user?.id],
    queryFn: () => api<Summary>("/api/dashboard/summary"),
    enabled: Boolean(user),
  });

  if (!user) return null;
  const isCustomer = user.role === "CUSTOMER";
  const isMaid = user.role === "MAID";
  const isManager = user.role === "MAID_MANAGER" || user.role === "ADMIN";
  const isAdmin = user.role === "ADMIN";
  const title = isCustomer ? "Customer overview" : isMaid ? "Caregiver overview" : isAdmin ? "Admin overview" : isManager ? "Manager overview" : "Platform overview";
  const metrics = isCustomer
    ? [{ label: "Care requests", value: data.metrics.requests, detail: "Requests created by your family" }, { label: "Active assignments", value: data.metrics.assignments, detail: "Care currently being coordinated" }, { label: "Available caregivers", value: data.metrics.availableCaregivers, detail: "Verified and active caregivers" }, { label: "Open complaints", value: data.metrics.openComplaints, detail: "Items awaiting resolution" }]
    : [{ label: "Requests", value: data.metrics.requests, detail: "Requests in the system" }, { label: "Active assignments", value: data.metrics.assignments, detail: "Assignments in progress" }, { label: "Available caregivers", value: data.metrics.availableCaregivers, detail: "Verified and active caregivers" }, { label: "Open complaints", value: data.metrics.openComplaints, detail: "Items awaiting resolution" }];

  async function assign(requestId: string) {
    const maidId = assigned[requestId];
    if (!maidId) { message.warning("Choose a caregiver first."); return; }
    try { await post("/api/assignments", { requestId, maidId }); message.success("Caregiver assigned."); await queryClient.invalidateQueries({ queryKey: ["dashboard-summary", user?.id] }); }
    catch (cause) { message.error(cause instanceof Error ? cause.message : "Could not assign this caregiver."); }
  }

  return <div className="workspace-content">
    <div className="page-title-row"><div><Text type="secondary">YOUR WORKSPACE</Text><Title level={2}>{title}</Title><Text className="muted">Here’s the latest across your CareConnect activity.</Text></div>{isCustomer && <Button type="primary" href="/customer/requests/new" icon={<CalendarOutlined />}>Request care</Button>}</div>
    {loading ? <Skeleton active /> : isError ? <Alert type="error" showIcon message={error instanceof Error ? error.message : "Could not load the dashboard."} description={<Button type="link" onClick={() => void refetch()}>Retry</Button>} /> : <>
      <Row gutter={[16, 16]}>{metrics.map((metric) => <Col xs={12} xl={6} key={metric.label}><Card className="metric-card"><Statistic title={metric.label} value={metric.value} /><Text type="secondary">{metric.detail}</Text></Card></Col>)}</Row>
      {isMaid && <Card className="manager-card" style={{ marginTop: 18 }}><Space><SafetyCertificateOutlined style={{ color: "#246b50", fontSize: 20 }} /><div><Text strong>Profile verification</Text><br /><Text type="secondary">Your eligibility is confirmed by a manager after document review.</Text></div><Tag color={data.caregiverStatus === "ACTIVE" || data.caregiverStatus === "VERIFIED" ? "green" : "gold"}>{(data.caregiverStatus ?? "PENDING").replaceAll("_", " ")}</Tag></Space></Card>}
      {isManager && <Card className="manager-card" style={{ marginTop: 18 }} title="Requests waiting for a caregiver" extra={<Text type="secondary">Assign verified or active caregivers</Text>}>
        {data.managerQueue.length === 0 ? <Empty description="No open requests right now." /> : <List dataSource={data.managerQueue} renderItem={(item) => <List.Item actions={[
          <Select key="caregiver" aria-label={`Caregiver for ${item.service.name}`} placeholder="Choose caregiver" style={{ width: 190 }} value={assigned[item.id]} onChange={(value) => setAssigned((current) => ({ ...current, [item.id]: value }))} options={data.availableMaids.map((maid) => ({ value: maid.id, label: maid.name }))} disabled={data.availableMaids.length === 0} />,
          <Button key="assign" type="primary" onClick={() => void assign(item.id)} disabled={data.availableMaids.length === 0}>Assign</Button>,
        ]}><List.Item.Meta title={`${item.service.name} · ${item.customer.name}`} description={`${item.location} · ${new Date(item.preferredDate).toLocaleDateString()} · ${item.status.replaceAll("_", " ")}`} /></List.Item>} />}
      </Card>}
      <Row gutter={[18, 18]} style={{ marginTop: 18 }}>
        <Col xs={24} lg={14}><Card title={isCustomer ? "Upcoming care tasks" : "Tasks and schedule"} extra={<Text type="secondary">{data.tasks.length} shown</Text>}>
          {data.tasks.length === 0 ? <Empty description="No tasks are scheduled yet." /> : <List dataSource={data.tasks} renderItem={(task) => <List.Item><List.Item.Meta title={task.title} description={`${task.assignment.request.service.name}${task.dueAt ? ` · ${new Date(task.dueAt).toLocaleString()}` : ""}`} /><Tag color={task.status === "COMPLETED" ? "green" : "blue"}>{task.status.replaceAll("_", " ")}</Tag></List.Item>} />}
        </Card></Col>
        <Col xs={24} lg={10}><Card title="Recent updates" extra={<Badge count={data.notifications.length} showZero={false} />}>
          {data.notifications.length === 0 ? <Empty description="You’re all caught up." /> : <List dataSource={data.notifications} renderItem={(notice) => <List.Item><List.Item.Meta title={notice.title} description={<>{notice.message}<br /><Text type="secondary">{new Date(notice.createdAt).toLocaleString()}</Text></>} /></List.Item>} />}
        </Card></Col>
      </Row>
    </>}
  </div>;
}

type CareRequest = {
  id: string; status: string; location: string; preferredDate: string; preferredTime: string;
  service: { name: string }; assignments: Array<{ id: string; maid: { name: string } }>;
};

export function RequestsPage() {
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ requests: CareRequest[] }>("/api/service-requests").then((value) => setRequests(value.requests)).catch((cause) => message.error(cause instanceof Error ? cause.message : "Could not load care requests.")).finally(() => setLoading(false));
  }, []);
  return <div className="workspace-content"><div className="page-title-row"><div><Text type="secondary">CUSTOMER</Text><Title level={2}>Care requests</Title><Text className="muted">Review request status and assigned caregivers.</Text></div><Button type="primary" href="/customer/requests/new">New request</Button></div><Card>{loading ? <Skeleton active /> : requests.length === 0 ? <Empty description="No requests yet. Create one to get started." /> : <List dataSource={requests} renderItem={(request) => <List.Item extra={<Tag color={request.status === "COMPLETED" ? "green" : "blue"}>{request.status.replaceAll("_", " ")}</Tag>}><List.Item.Meta title={request.service.name} description={<>{request.location} · {new Date(request.preferredDate).toLocaleDateString()} at {request.preferredTime}{request.assignments[0] && <><br />Caregiver: {request.assignments[0].maid.name}</>}</>} /></List.Item>} />}</Card></div>;
}

type Service = { id: string; name: string; description?: string | null };

export function NewRequestPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api<{ services: Service[] }>("/api/services").then((data) => setServices(data.services)).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load services.")).finally(() => setLoading(false)); }, []);

  async function submit(values: { serviceId: string; location: string; date: string; time: string; durationHours: number; requiredSkills?: string; preferences?: string; notes?: string }) {
    setBusy(true); setError("");
    try {
      const preferredDate = new Date(`${values.date}T${values.time}`).toISOString();
      await post("/api/service-requests", {
        serviceId: values.serviceId,
        location: values.location,
        preferredDate,
        preferredTime: values.time,
        durationHours: Number(values.durationHours),
        requiredSkills: (values.requiredSkills ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
        preferences: values.preferences || undefined,
        notes: values.notes || undefined,
      });
      message.success("Your care request was submitted.");
      navigate("/customer/requests");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit your request."); }
    finally { setBusy(false); }
  }

  return <div className="workspace-content"><div className="page-title-row"><div><Text type="secondary">CUSTOMER</Text><Title level={2}>Request care</Title><Text className="muted">A manager will review your details and coordinate a caregiver.</Text></div></div>
    {loading ? <Skeleton active /> : services.length === 0 ? <Alert type="info" showIcon message="No services are configured yet" description="Ask an administrator to add a service category." /> : <Card className="form-card">
      <Form layout="vertical" requiredMark={false} onFinish={submit} initialValues={{ durationHours: 3 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}><Form.Item label="Service type" name="serviceId" rules={[{ required: true }]}><Select size="large" placeholder="Select a service" options={services.map((service) => ({ value: service.id, label: service.name }))} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Service location" name="location" rules={[{ required: true, min: 4, max: 300 }]}><Input size="large" placeholder="Neighborhood, city" /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Preferred date" name="date" rules={[{ required: true }]}><Input type="date" size="large" min={new Date().toISOString().slice(0, 10)} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Preferred time" name="time" rules={[{ required: true }]}><Input type="time" size="large" /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Duration (hours)" name="durationHours" rules={[{ required: true }]}><Input type="number" min={1} max={24} size="large" /></Form.Item></Col>
          <Col span={24}><Form.Item label="Required skills" name="requiredSkills"><Input size="large" placeholder="Companionship, meal preparation" /></Form.Item></Col>
          <Col span={24}><Form.Item label="Preferences" name="preferences"><Input.TextArea rows={2} maxLength={1000} showCount placeholder="Caregiver preferences or scheduling details" /></Form.Item></Col>
          <Col span={24}><Form.Item label="Additional notes" name="notes"><Input.TextArea rows={3} maxLength={2000} showCount placeholder="Share details that will help us coordinate" /></Form.Item></Col>
        </Row>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Space><Button type="primary" htmlType="submit" loading={busy}>Submit request</Button><Button onClick={() => navigate("/customer/dashboard")}>Cancel</Button></Space>
      </Form>
    </Card>}
  </div>;
}

type Job = {
  id: string; status: string; request: { location: string; preferredDate: string; preferredTime: string; durationHours: number; service: { name: string } };
  customer: { name: string }; tasks: Array<{ id: string; title: string; status: string }>;
  attendance: Array<{ checkOut: string | null }>;
};

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { const result = await api<{ jobs: Job[] }>("/api/maid/jobs"); setJobs(result.jobs); }
    catch (cause) { message.error(cause instanceof Error ? cause.message : "Could not load jobs."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function run(url: string, method: "POST" | "PATCH", body?: unknown) {
    try { await api(url, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); message.success("Update saved."); await load(); }
    catch (cause) { message.error(cause instanceof Error ? cause.message : "Action failed."); }
  }

  return <div className="workspace-content"><div className="page-title-row"><div><Text type="secondary">CAREGIVER</Text><Title level={2}>Jobs and tasks</Title><Text className="muted">Accept assignments, update tasks, and record attendance.</Text></div></div>
    {loading ? <Skeleton active /> : jobs.length === 0 ? <Card><Empty description="No active assignments. New work will appear here." /></Card> : <Row gutter={[16, 16]}>{jobs.map((job) => {
      const checkedIn = Boolean(job.attendance[0] && !job.attendance[0].checkOut);
      return <Col span={24} key={job.id}><Card title={job.request.service.name} extra={<Tag color={job.status === "ACTIVE" ? "green" : "blue"}>{job.status.replaceAll("_", " ")}</Tag>}>
        <Space direction="vertical" size={4}><Text>For {job.customer.name} · {job.request.location}</Text><Text type="secondary">{new Date(job.request.preferredDate).toLocaleDateString()} · {job.request.preferredTime} · {job.request.durationHours} hours</Text></Space>
        <Divider />
        {job.tasks.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks listed." /> : <List size="small" dataSource={job.tasks} renderItem={(task) => <List.Item actions={task.status === "COMPLETED" || task.status === "CANCELLED" ? [<Tag key="status" color="green">{task.status.replaceAll("_", " ")}</Tag>] : [<Button key="complete" size="small" disabled={job.status === "PENDING"} onClick={() => void run(`/api/tasks/${task.id}`, "PATCH", { status: "COMPLETED" })}>Complete task</Button>]}>{task.title}</List.Item>} />}
        <Space wrap style={{ marginTop: 14 }}>{job.status === "PENDING" && <Button type="primary" onClick={() => void run(`/api/assignments/${job.id}/accept`, "POST")}>Accept assignment</Button>}{job.status !== "PENDING" && <Button type="primary" icon={checkedIn ? <CheckCircleOutlined /> : <ClockCircleOutlined />} onClick={() => void run("/api/attendance", "POST", { assignmentId: job.id, action: checkedIn ? "CHECK_OUT" : "CHECK_IN" })}>{checkedIn ? "Check out" : "Check in"}</Button>}</Space>
      </Card></Col>;
    })}</Row>}
  </div>;
}

export type { SessionUser };

type CaregiverRecord = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  maidProfile: { status: string; experienceYears: number; serviceArea: string | null; skills: string[] } | null;
};

type CaregiverFormValues = { name: string; email: string; phone: string; serviceArea?: string; skills?: string };

export function CaregiversPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CaregiverFormValues>();
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["caregivers"],
    queryFn: () => api<{ caregivers: CaregiverRecord[] }>("/api/caregivers"),
  });

  async function createCaregiver(values: CaregiverFormValues) {
    setSaving(true);
    try {
      await post("/api/caregivers", values);
      message.success("Caregiver account created. It is pending verification.");
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["caregivers"] });
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : "Could not create the caregiver account.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateCaregiver(id: string) {
    setDeactivatingId(id);
    try {
      await api(`/api/caregivers/${id}`, { method: "DELETE" });
      message.success("Caregiver access disabled; service history was retained.");
      await queryClient.invalidateQueries({ queryKey: ["caregivers"] });
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : "Could not deactivate the caregiver.");
    } finally {
      setDeactivatingId(null);
    }
  }

  const caregivers = data?.caregivers ?? [];
  return <div className="workspace-content">
    <div className="page-title-row"><div><Text type="secondary">AGENCY TEAM</Text><Title level={2}>Caregivers</Title><Text className="muted">Create agency-managed accounts and control access.</Text></div></div>
    <Card title="Add caregiver account" style={{ marginBottom: 18 }}>
      <Paragraph className="muted">New accounts start with pending verification and sign in using a code sent to their registered phone.</Paragraph>
      <Form form={form} layout="vertical" onFinish={createCaregiver} requiredMark={false}>
        <Row gutter={[12, 0]}>
          <Col xs={24} md={12}><Form.Item label="Full name" name="name" rules={[{ required: true, min: 2, max: 80 }]}><Input autoComplete="name" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Email address" name="email" rules={[{ required: true }, { type: "email", max: 254 }]}><Input autoComplete="email" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Mobile number" name="phone" extra="Include the + and country code, without spaces." rules={[{ required: true }, { pattern: /^\+[1-9]\d{7,14}$/, message: "Use international format such as +919876543210." }]}><Input autoComplete="tel" placeholder="+919876543210" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Service area" name="serviceArea"><Input maxLength={160} /></Form.Item></Col>
          <Col span={24}><Form.Item label="Skills" name="skills" extra="Separate skills with commas."><Input maxLength={1000} placeholder="Companionship, meal preparation" /></Form.Item></Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={saving}>Create caregiver</Button>
      </Form>
    </Card>
    <Card title={`Caregiver accounts (${caregivers.length})`}>
      {isPending ? <Skeleton active /> : isError ? <Alert type="error" showIcon message={error instanceof Error ? error.message : "Could not load caregivers."} description={<Button type="link" onClick={() => void refetch()}>Retry</Button>} /> : caregivers.length === 0 ? <Empty description="No caregiver accounts yet." /> : <List dataSource={caregivers} renderItem={(caregiver) => {
        const status = caregiver.isActive ? caregiver.maidProfile?.status ?? "PENDING" : "DEACTIVATED";
        const statusColor = !caregiver.isActive ? "default" : status === "ACTIVE" || status === "VERIFIED" ? "green" : "gold";
        const details = [caregiver.maidProfile?.serviceArea, ...(caregiver.maidProfile?.skills ?? [])].filter(Boolean).join(" · ");
        return <List.Item actions={caregiver.isActive ? [<Popconfirm key="deactivate" title="Deactivate this caregiver?" description="They will lose sign-in access. Assignment and audit history will remain." okText="Deactivate" cancelText="Cancel" okButtonProps={{ danger: true }} onConfirm={() => void deactivateCaregiver(caregiver.id)}><Button size="small" danger loading={deactivatingId === caregiver.id}>Deactivate</Button></Popconfirm>] : [<Tag key="inactive">Access disabled</Tag>]}>
          <List.Item.Meta title={<Space wrap>{caregiver.name}<Tag color={statusColor}>{status.replaceAll("_", " ")}</Tag></Space>} description={<>{caregiver.email}{details ? ` · ${details}` : ""} · Added {new Date(caregiver.createdAt).toLocaleDateString()}</>} />
        </List.Item>;
      }} />}
    </Card>
  </div>;
}
