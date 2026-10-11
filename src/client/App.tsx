import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Button, Layout, Menu, Spin, Typography } from "antd";
import {
  CalendarOutlined,
  FileTextOutlined,
  HeartOutlined,
  HomeOutlined,
  LogoutOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuth } from "./auth";
import { dashboardPath } from "./api";
import {
  DashboardPage,
  CaregiversPage,
  ForgotPasswordPage,
  LandingPage,
  LoginPage,
  NewRequestPage,
  RegisterPage,
  RequestsPage,
  ResetPasswordPage,
  JobsPage,
  ProfileSetupPage,
} from "./pages";

const menus = {
  CUSTOMER: [
    { key: "/customer/dashboard", label: "Overview", icon: <HomeOutlined /> },
    { key: "/customer/requests", label: "Care requests", icon: <FileTextOutlined /> },
    { key: "/customer/requests/new", label: "Request care", icon: <CalendarOutlined /> },
  ],
  MAID: [
    { key: "/maid/dashboard", label: "Overview", icon: <HomeOutlined /> },
    { key: "/maid/jobs", label: "Jobs & tasks", icon: <FileTextOutlined /> },
  ],
  MAID_MANAGER: [
    { key: "/manager/dashboard", label: "Overview", icon: <HomeOutlined /> },
    { key: "/manager/caregivers", label: "Caregivers", icon: <TeamOutlined /> },
  ],
  ADMIN: [
    { key: "/admin/dashboard", label: "Overview", icon: <HomeOutlined /> },
    { key: "/admin/caregivers", label: "Caregivers", icon: <TeamOutlined /> },
  ],
} as const;

function LoadingScreen() {
  return <div className="loading-screen"><Spin size="large" /></div>;
}

function RequireSignedIn() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.profileComplete) return <Navigate to="/profile/setup" replace />;
  return <WorkspaceShell />;
}

function RequireProfileSetup() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.profileComplete) return <Navigate to={dashboardPath(user.role)} replace />;
  return <ProfileSetupPage />;
}

function RequireRole({ role }: { role: "CUSTOMER" | "MAID" | "MAID_MANAGER" | "ADMIN" }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={dashboardPath(user.role)} replace />;
  return <Outlet />;
}

function WorkspaceShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  const roleMenus = menus[user.role as keyof typeof menus] ?? menus.ADMIN;

  return (
    <Layout className="workspace">
      <Layout.Sider breakpoint="lg" collapsedWidth="0" theme="light" width={248} style={{ borderRight: "1px solid var(--care-line)" }}>
        <div className="workspace-logo"><Brand /></div>
        <Typography.Text className="menu-caption">WORKSPACE</Typography.Text>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[...roleMenus]}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 0, padding: "0 10px" }}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="workspace-header">
          <div>
            <Typography.Text strong>{user.name}</Typography.Text>
            <Typography.Text className="header-role">{user.role.replaceAll("_", " ")}</Typography.Text>
          </div>
          <Button icon={<LogoutOutlined />} onClick={async () => { await signOut(); navigate("/", { replace: true }); }}>Sign out</Button>
        </Layout.Header>
        <Layout.Content><Outlet /></Layout.Content>
      </Layout>
    </Layout>
  );
}

function Brand() {
  return <span className="brand"><span className="brand-icon"><HeartOutlined /></span>CareConnect</span>;
}

function NotFound() {
  return <main className="auth-wrap"><div className="auth-card"><Typography.Title level={2}>Page not found</Typography.Title><Button type="primary" href="/">Back to CareConnect</Button></div></main>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile/setup" element={<RequireProfileSetup />} />
        <Route element={<RequireSignedIn />}>
          <Route element={<RequireRole role="CUSTOMER" />}>
            <Route path="/customer/dashboard" element={<DashboardPage />} />
            <Route path="/customer/requests" element={<RequestsPage />} />
            <Route path="/customer/requests/new" element={<NewRequestPage />} />
          </Route>
          <Route element={<RequireRole role="MAID" />}>
            <Route path="/maid/dashboard" element={<DashboardPage />} />
            <Route path="/maid/jobs" element={<JobsPage />} />
          </Route>
          <Route element={<RequireRole role="MAID_MANAGER" />}>
            <Route path="/manager/dashboard" element={<DashboardPage />} />
            <Route path="/manager/caregivers" element={<CaregiversPage />} />
          </Route>
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/caregivers" element={<CaregiversPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
