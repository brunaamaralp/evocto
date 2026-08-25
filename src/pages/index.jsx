import Layout from "./Layout.jsx";

import PasswordReset from "./PasswordReset";

import ClientArea from "./ClientArea";

import ProjectSettings from "./ProjectSettings";

import EvolutionPanel from "./EvolutionPanel";

import briefings from "./briefings";

import insights from "./insights";

import scopeGenerator from "./scope-generator";

import myAgency from "./my-agency";

import briefingEditor from "./briefing-editor";

import insightsEditor from "./insights-editor";

import scopeEditor from "./scope-editor";

import publicApproval from "./public-approval";

import settings from "./settings";

import onboarding from "./onboarding";

import myAccount from "./my-account";

import termsOfService from "./terms-of-service";

import privacyPolicy from "./privacy-policy";

import services from "./services";

import serviceEditor from "./service-editor";

import clients from "./clients";

import client from "./client";

import library from "./library";

import today from "./today";

import servicesOverview from "./services-overview";

import cycleapproval from "./cycle-approval";

import WorkOrders from "./WorkOrders";

import servicepolicies from "./service-policies";

import cycleclosing from "./cycle-closing";

import notificationpreferences from "./notification-preferences";

import ClientPortal from "./ClientPortal";

import NotFound from "./NotFound";

import Unauthorized from "./Unauthorized";

import ClientDemo from "./ClientDemo";

import cycleplan from "./cycle-plan";

import jobsmonitor from "./jobs-monitor";

import inviteaccept from "./invite-accept";

import welcome from "./welcome";

import login from "./login";

import dashboard from "./dashboard";

import servicedetail from "./service-detail";

import agentsdashboard from "./agents-dashboard";

import clientdetail from "./client-detail";

import clientdashboard from "./client-dashboard";

import aicentral from "./ai-central";

import aiconfiguration from "./ai-configuration";

import cyclereport from "./cycle-report";

import aprendizados from "./aprendizados";

import publicbriefing from "./public-briefing";

import createaccount from "./create-account";

import clientplanning from "./client-planning";

import approvaldashboard from "./approval-dashboard";

import tasksmanager from "./tasks-manager";

import clientportal from "./client-portal";

import clientactivation from "./client-activation";

import clientlogin from "./client-login";

import teammanagement from "./team-management";

import invites from "./invites";

import teammembers from "./team-members";

import servicedeliverables from "./service-deliverables";

import cycleApprovalManager from "./cycle-approval-manager";

import tasksboard from "./tasks-board";

import learningsmanager from "./learnings-manager";

import clientPortalOverview from "./client-portal-overview";

import tasks from "./tasks";

import financialdiagnosis from "./financial-diagnosis";

import automationdashboard from "./automation-dashboard";

import financialkpis from "./financial-kpis";

import supportlibrary from "./support-library";

import clientdiagnostic from "./client-diagnostic";

import clienttasks from "./client-tasks";

import clientsettings from "./client-settings";

import document from "./document";

import publicDeliverableApproval from "./public-deliverable-approval";

import customreports from "./custom-reports";

import serviceTemplateEditor from "./service-template-editor";

import serviceInstanceEditor from "./service-instance-editor";

import clientPortalServiceOverview from "./client-portal-service-overview";

import clientPortalServiceDocuments from "./client-portal-service-documents";

import settingsprofile from "./settings-profile";

import settingsnotifications from "./settings-notifications";

import settingsAgencyFeatures from "./settings-agency-features";

import datareview from "./data-review";

import clientevolution from "./client-evolution";

import clientlearnings from "./client-learnings";

import agencymanagement from "./agency-management";

import clientdocuments from "./client-documents";

import systemhealth from "./system-health";

import clientcontext from "./client-context";

import auditreport from "./audit-report";

import uploadcenter from "./upload-center";

import mappingwizard from "./mapping-wizard";

import e2etest from "./e2e-test";

import briefingtemplates from "./briefing-templates";

import briefingtokens from "./briefing-tokens";

import clientSetPassword from "./client-set-password";

import testBriefingAccess from "./test-briefing-access";

import spaTestDashboard from "./spa-test-dashboard";

import clientbriefing from "./client-briefing";

import clientservices from "./client-services";

import e2eGoldenPath from "./e2e-golden-path";

import servicetemplates from "./service-templates";

import qadashboard from "./qa-dashboard";

import settingsAgencyCategories from "./settings-agency-categories";

import connectivitydashboard from "./connectivity-dashboard";

import briefingdemo from "./briefing-demo";

import serviceTemplatesViewer from "./service-templates-viewer";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    PasswordReset: PasswordReset,
    
    ClientArea: ClientArea,
    
    ProjectSettings: ProjectSettings,
    
    EvolutionPanel: EvolutionPanel,
    
    briefings: briefings,
    
    insights: insights,
    
    "scope-generator": scopeGenerator,
    
    "my-agency": myAgency,
    
    "briefing-editor": briefingEditor,
    
    "insights-editor": insightsEditor,
    
    "scope-editor": scopeEditor,
    
    "public-approval": publicApproval,
    
    settings: settings,
    
    onboarding: onboarding,
    
    "my-account": myAccount,
    
    
    "terms-of-service": termsOfService,
    
    "privacy-policy": privacyPolicy,
    
    services: services,
    
    "service-editor": serviceEditor,
    
    clients: clients,
    
    client: client,
    
    library: library,
    
    today: today,
    
    "services-overview": servicesOverview,
    
    "cycle-approval": cycleapproval,
    
    WorkOrders: WorkOrders,
    
    "service-policies": servicepolicies,
    
    "cycle-closing": cycleclosing,
    
    "notification-preferences": notificationpreferences,
    
    ClientPortal: ClientPortal,
    
    
    NotFound: NotFound,
    
    Unauthorized: Unauthorized,
    
    ClientDemo: ClientDemo,
    
    "cycle-plan": cycleplan,
    
    "jobs-monitor": jobsmonitor,
    
    "invite-accept": inviteaccept,
    
    welcome: welcome,
    
    login: login,
    
    dashboard: dashboard,
    
    "service-detail": servicedetail,
    
    "agents-dashboard": agentsdashboard,
    
    "client-detail": clientdetail,
    
    "client-dashboard": client-dashboard,
    
    "ai-central": aicentral,
    
    "ai-configuration": ai-configuration,
    
    "cycle-report": cyclereport,
    
    aprendizados: aprendizados,
    
    "public-briefing": publicbriefing,
    
    "create-account": createaccount,
    
    "client-planning": clientplanning,
    
    "approval-dashboard": approvaldashboard,
    
    "tasks-manager": tasksmanager,
    
    "client-portal": clientportal,
    
    "client-activation": clientactivation,
    
    "client-login": clientlogin,
    
    "team-management": teammanagement,
    
    invites: invites,
    
    "team-members": teammembers,
    
    "service-deliverables": servicedeliverables,
    
    "cycle-approval-manager": cycleApprovalManager,
    
    "tasks-board": tasksboard,
    
    "learnings-manager": learningsmanager,
    
    "client-portal-overview": clientPortalOverview,
    
    tasks: tasks,
    
    "financial-diagnosis": financialdiagnosis,
    
    "automation-dashboard": automationdashboard,
    
    "financial-kpis": financialkpis,
    
    "support-library": supportlibrary,
    
    "client-diagnostic": clientdiagnostic,
    
    "client-tasks": clienttasks,
    
    "client-settings": clientsettings,
    
    document: document,
    
    "public-deliverable-approval": publicDeliverableApproval,
    
    "custom-reports": customreports,
    
    "service-template-editor": serviceTemplateEditor,
    
    "service-instance-editor": serviceInstanceEditor,
    
    "client-portal-service-overview": clientPortalServiceOverview,
    
    "client-portal-service-documents": clientPortalServiceDocuments,
    
    "settings-profile": settingsprofile,
    
    "settings-notifications": settingsnotifications,
    
    
    "settings-agency-features": settingsAgencyFeatures,
    
    "data-review": datareview,
    
    "client-evolution": clientevolution,
    
    "client-learnings": clientlearnings,
    
    "agency-management": agencymanagement,
    
    "client-documents": clientdocuments,
    
    "system-health": systemhealth,
    
    "client-context": clientcontext,
    
    "audit-report": auditreport,
    
    "upload-center": uploadcenter,
    
    "mapping-wizard": mappingwizard,
    
    "e2e-test": e2etest,
    
    "briefing-templates": briefingtemplates,
    
    "briefing-tokens": briefingtokens,
    
    "client-set-password": clientSetPassword,
    
    "test-briefing-access": testBriefingAccess,
    
    "spa-test-dashboard": spaTestDashboard,
    
    "client-briefing": clientbriefing,
    
    "client-services": clientservices,
    
    "e2e-golden-path": e2eGoldenPath,
    
    "service-templates": servicetemplates,
    
    "qa-dashboard": qadashboard,
    'connectivity-dashboard': connectivity-dashboard,
    
    'briefing-demo': briefing-demo,
    
    'service-templates-viewer': serviceTemplatesViewer,
    
    "settings-agency-categories": settingsAgencyCategories,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<PasswordReset />} />
                
                
                <Route path="/PasswordReset" element={<PasswordReset />} />
                
                <Route path="/ClientArea" element={<ClientArea />} />
                
                <Route path="/ProjectSettings" element={<ProjectSettings />} />
                
                <Route path="/EvolutionPanel" element={<EvolutionPanel />} />
                
                <Route path="/briefings" element={<briefings />} />
                
                <Route path="/insights" element={<insights />} />
                
                <Route path="/scope-generator" element={<scopeGenerator />} />
                
                <Route path="/my-agency" element={<myAgency />} />
                
                <Route path="/briefing-editor" element={<briefingEditor />} />
                
                <Route path="/insights-editor" element={<insights-editor />} />
                
                <Route path="/scope-editor" element={<scope-editor />} />
                
                <Route path="/public-approval" element={<public-approval />} />
                
                <Route path="/settings" element={<settings />} />
                
                <Route path="/onboarding" element={<onboarding />} />
                
                <Route path="/my-account" element={<my-account />} />
                
                
                <Route path="/terms-of-service" element={<terms-of-service />} />
                
                <Route path="/privacy-policy" element={<privacy-policy />} />
                
                <Route path="/services" element={<services />} />
                
                <Route path="/service-editor" element={<service-editor />} />
                
                <Route path="/clients" element={<clients />} />
                
                <Route path="/client" element={<client />} />
                
                <Route path="/library" element={<library />} />
                
                <Route path="/today" element={<today />} />
                
                <Route path="/services-overview" element={<services-overview />} />
                
                <Route path="/cycle-approval" element={<cycle-approval />} />
                
                <Route path="/WorkOrders" element={<WorkOrders />} />
                
                <Route path="/service-policies" element={<service-policies />} />
                
                <Route path="/cycle-closing" element={<cycle-closing />} />
                
                <Route path="/notification-preferences" element={<notification-preferences />} />
                
                <Route path="/ClientPortal" element={<ClientPortal />} />
                
                
                <Route path="/NotFound" element={<NotFound />} />
                
                <Route path="/Unauthorized" element={<Unauthorized />} />
                
                <Route path="/ClientDemo" element={<ClientDemo />} />
                
                <Route path="/cycle-plan" element={<cycle-plan />} />
                
                <Route path="/jobs-monitor" element={<jobs-monitor />} />
                
                <Route path="/invite-accept" element={<invite-accept />} />
                
                <Route path="/welcome" element={<welcome />} />
                
                <Route path="/login" element={<login />} />
                
                <Route path="/dashboard" element={<dashboard />} />
                
                <Route path="/service-detail" element={<service-detail />} />
                
                <Route path="/agents-dashboard" element={<agents-dashboard />} />
                
                <Route path="/client-detail" element={<client-detail />} />
                
                <Route path="/cliente/:clienteId/servicos/:servicoId/dashboard" element={<client-dashboard />} />
                
                <Route path="/ai-central" element={<ai-central />} />
                
                <Route path="/ai-configuration" element={<ai-configuration />} />
                
                <Route path="/cycle-report" element={<cycle-report />} />
                
                <Route path="/aprendizados" element={<aprendizados />} />
                
                <Route path="/public-briefing" element={<public-briefing />} />
                
                <Route path="/create-account" element={<create-account />} />
                
                <Route path="/client-planning" element={<client-planning />} />
                
                <Route path="/approval-dashboard" element={<approval-dashboard />} />
                
                <Route path="/tasks-manager" element={<tasks-manager />} />
                
                <Route path="/client-portal" element={<client-portal />} />
                
                <Route path="/client-activation" element={<client-activation />} />
                
                <Route path="/client-login" element={<client-login />} />
                
                <Route path="/team-management" element={<team-management />} />
                
                <Route path="/invites" element={<invites />} />
                
                <Route path="/team-members" element={<team-members />} />
                
                <Route path="/service-deliverables" element={<service-deliverables />} />
                
                <Route path="/cycle-approval-manager" element={<cycle-approval-manager />} />
                
                <Route path="/tasks-board" element={<tasks-board />} />
                
                <Route path="/learnings-manager" element={<learnings-manager />} />
                
                <Route path="/client-portal-overview" element={<client-portal-overview />} />
                
                <Route path="/tasks" element={<tasks />} />
                
                <Route path="/financial-diagnosis" element={<financial-diagnosis />} />
                
                <Route path="/automation-dashboard" element={<automation-dashboard />} />
                
                <Route path="/financial-kpis" element={<financial-kpis />} />
                
                <Route path="/support-library" element={<support-library />} />
                
                <Route path="/client-diagnostic" element={<client-diagnostic />} />
                
                <Route path="/client-tasks" element={<client-tasks />} />
                
                <Route path="/client-settings" element={<clientsettings />} />
                
                <Route path="/document" element={<document />} />
                
                <Route path="/public-deliverable-approval" element={<publicDeliverableApproval />} />
                
                <Route path="/custom-reports" element={<customreports />} />
                
                <Route path="/service-template-editor" element={<serviceTemplateEditor />} />
                
                <Route path="/service-instance-editor" element={<serviceInstanceEditor />} />
                
                <Route path="/client-portal-service-overview" element={<clientPortalServiceOverview />} />
                
                <Route path="/client-portal-service-documents" element={<clientPortalServiceDocuments />} />
                
                <Route path="/settings-profile" element={<settings-profile />} />
                
                <Route path="/settings-notifications" element={<settings-notifications />} />
                
                
                <Route path="/settings-agency-features" element={<settingsAgencyFeatures />} />
                
                <Route path="/data-review" element={<data-review />} />
                
                <Route path="/client-evolution" element={<client-evolution />} />
                
                <Route path="/client-learnings" element={<client-learnings />} />
                
                <Route path="/agency-management" element={<agency-management />} />
                
                <Route path="/client-documents" element={<client-documents />} />
                
                <Route path="/system-health" element={<system-health />} />
                
                <Route path="/client-context" element={<client-context />} />
                
                <Route path="/audit-report" element={<audit-report />} />
                
                <Route path="/upload-center" element={<upload-center />} />
                
                <Route path="/mapping-wizard" element={<mapping-wizard />} />
                
                <Route path="/e2e-test" element={<e2e-test />} />
                
                <Route path="/briefing-templates" element={<briefing-templates />} />
                
                <Route path="/briefing-tokens" element={<briefing-tokens />} />
                
                <Route path="/client-set-password" element={<clientSetPassword />} />
                
                <Route path="/test-briefing-access" element={<testBriefingAccess />} />
                
                <Route path="/spa-test-dashboard" element={<spaTestDashboard />} />
                
                <Route path="/client-briefing" element={<client-briefing />} />
                
                <Route path="/client-services" element={<client-services />} />
                
                <Route path="/e2e-golden-path" element={<e2eGoldenPath />} />
                
                <Route path="/service-templates" element={<service-templates />} />
                
                <Route path="/qa-dashboard" element={<qa-dashboard />} />
                <Route path="/connectivity-dashboard" element={<connectivity-dashboard />} />
                <Route path="/briefing-demo" element={<briefing-demo />} />
                <Route path="/service-templates-viewer" element={<serviceTemplatesViewer />} />
                
                <Route path="/settings-agency-categories" element={<settingsAgencyCategories />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
