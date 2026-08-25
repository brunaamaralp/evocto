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

import { createElement } from 'react';
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
    
    "client-dashboard": clientdashboard,
    
    "ai-central": aicentral,
    
    "ai-configuration": aiconfiguration,
    
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
    'connectivity-dashboard': connectivitydashboard,
    
    'briefing-demo': briefingdemo,
    
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

    if (!urlLastPart) {
        return 'welcome';
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
                
                    <Route path="/" element={createElement(welcome)} />
                
                
                <Route path="/PasswordReset" element={<PasswordReset />} />
                <Route path="/password-reset" element={<PasswordReset />} />
                
                <Route path="/ClientArea" element={<ClientArea />} />
                
                <Route path="/ProjectSettings" element={<ProjectSettings />} />
                
                <Route path="/EvolutionPanel" element={<EvolutionPanel />} />
                
                <Route path="/briefings" element={createElement(briefings)} />
                
                <Route path="/insights" element={createElement(insights)} />
                
                <Route path="/scope-generator" element={createElement(scopeGenerator)} />
                
                <Route path="/my-agency" element={createElement(myAgency)} />
                
                <Route path="/briefing-editor" element={createElement(briefingEditor)} />
                
                <Route path="/insights-editor" element={createElement(insightsEditor)} />
                
                <Route path="/scope-editor" element={createElement(scopeEditor)} />
                
                <Route path="/public-approval" element={createElement(publicApproval)} />
                
                <Route path="/settings" element={createElement(settings)} />
                
                <Route path="/onboarding" element={createElement(onboarding)} />
                
                <Route path="/my-account" element={createElement(myAccount)} />
                
                
                <Route path="/terms-of-service" element={createElement(termsOfService)} />
                
                <Route path="/privacy-policy" element={createElement(privacyPolicy)} />
                
                <Route path="/services" element={createElement(services)} />
                
                <Route path="/service-editor" element={createElement(serviceEditor)} />
                
                <Route path="/clients" element={createElement(clients)} />
                
                <Route path="/client" element={createElement(client)} />
                
                <Route path="/library" element={createElement(library)} />
                
                <Route path="/today" element={createElement(today)} />
                
                <Route path="/services-overview" element={createElement(servicesOverview)} />
                
                <Route path="/cycle-approval" element={createElement(cycleapproval)} />
                
                <Route path="/WorkOrders" element={<WorkOrders />} />
                
                <Route path="/service-policies" element={createElement(servicepolicies)} />
                
                <Route path="/cycle-closing" element={createElement(cycleclosing)} />
                
                <Route path="/notification-preferences" element={createElement(notificationpreferences)} />
                
                <Route path="/ClientPortal" element={<ClientPortal />} />
                
                
                <Route path="/NotFound" element={<NotFound />} />
                
                <Route path="/Unauthorized" element={<Unauthorized />} />
                
                <Route path="/ClientDemo" element={<ClientDemo />} />
                
                <Route path="/cycle-plan" element={createElement(cycleplan)} />
                
                <Route path="/jobs-monitor" element={createElement(jobsmonitor)} />
                
                <Route path="/invite-accept" element={createElement(inviteaccept)} />
                
                <Route path="/welcome" element={createElement(welcome)} />
                
                <Route path="/login" element={createElement(login)} />
                
                <Route path="/dashboard" element={createElement(dashboard)} />
                
                <Route path="/service-detail" element={createElement(servicedetail)} />
                
                <Route path="/agents-dashboard" element={createElement(agentsdashboard)} />
                
                <Route path="/client-detail" element={createElement(clientdetail)} />
                
                <Route path="/cliente/:clienteId/servicos/:servicoId/dashboard" element={createElement(clientdashboard)} />
                
                <Route path="/ai-central" element={createElement(aicentral)} />
                
                <Route path="/ai-configuration" element={createElement(aiconfiguration)} />
                
                <Route path="/cycle-report" element={createElement(cyclereport)} />
                
                <Route path="/aprendizados" element={createElement(aprendizados)} />
                
                <Route path="/public-briefing" element={createElement(publicbriefing)} />
                
                <Route path="/create-account" element={createElement(createaccount)} />
                
                <Route path="/client-planning" element={createElement(clientplanning)} />
                
                <Route path="/approval-dashboard" element={createElement(approvaldashboard)} />
                
                <Route path="/tasks-manager" element={createElement(tasksmanager)} />
                
                <Route path="/client-portal" element={createElement(clientportal)} />
                
                <Route path="/client-activation" element={createElement(clientactivation)} />
                
                <Route path="/client-login" element={createElement(clientlogin)} />
                
                <Route path="/team-management" element={createElement(teammanagement)} />
                
                <Route path="/invites" element={createElement(invites)} />
                
                <Route path="/team-members" element={createElement(teammembers)} />
                
                <Route path="/service-deliverables" element={createElement(servicedeliverables)} />
                
                <Route path="/cycle-approval-manager" element={createElement(cycleApprovalManager)} />
                
                <Route path="/tasks-board" element={createElement(tasksboard)} />
                
                <Route path="/learnings-manager" element={createElement(learningsmanager)} />
                
                <Route path="/client-portal-overview" element={createElement(clientPortalOverview)} />
                
                <Route path="/tasks" element={createElement(tasks)} />
                
                <Route path="/financial-diagnosis" element={createElement(financialdiagnosis)} />
                
                <Route path="/automation-dashboard" element={createElement(automationdashboard)} />
                
                <Route path="/financial-kpis" element={createElement(financialkpis)} />
                
                <Route path="/support-library" element={createElement(supportlibrary)} />
                
                <Route path="/client-diagnostic" element={createElement(clientdiagnostic)} />
                
                <Route path="/client-tasks" element={createElement(clienttasks)} />
                
                <Route path="/client-settings" element={createElement(clientsettings)} />
                
                <Route path="/document" element={createElement(document)} />
                
                <Route path="/public-deliverable-approval" element={createElement(publicDeliverableApproval)} />
                
                <Route path="/custom-reports" element={createElement(customreports)} />
                
                <Route path="/service-template-editor" element={createElement(serviceTemplateEditor)} />
                
                <Route path="/service-instance-editor" element={createElement(serviceInstanceEditor)} />
                
                <Route path="/client-portal-service-overview" element={createElement(clientPortalServiceOverview)} />
                
                <Route path="/client-portal-service-documents" element={createElement(clientPortalServiceDocuments)} />
                
                <Route path="/settings-profile" element={createElement(settingsprofile)} />
                
                <Route path="/settings-notifications" element={createElement(settingsnotifications)} />
                
                
                <Route path="/settings-agency-features" element={createElement(settingsAgencyFeatures)} />
                
                <Route path="/data-review" element={createElement(datareview)} />
                
                <Route path="/client-evolution" element={createElement(clientevolution)} />
                
                <Route path="/client-learnings" element={createElement(clientlearnings)} />
                
                <Route path="/agency-management" element={createElement(agencymanagement)} />
                
                <Route path="/client-documents" element={createElement(clientdocuments)} />
                
                <Route path="/system-health" element={createElement(systemhealth)} />
                
                <Route path="/client-context" element={createElement(clientcontext)} />
                
                <Route path="/audit-report" element={createElement(auditreport)} />
                
                <Route path="/upload-center" element={createElement(uploadcenter)} />
                
                <Route path="/mapping-wizard" element={createElement(mappingwizard)} />
                
                <Route path="/e2e-test" element={createElement(e2etest)} />
                
                <Route path="/briefing-templates" element={createElement(briefingtemplates)} />
                
                <Route path="/briefing-tokens" element={createElement(briefingtokens)} />
                
                <Route path="/client-set-password" element={createElement(clientSetPassword)} />
                
                <Route path="/test-briefing-access" element={createElement(testBriefingAccess)} />
                
                <Route path="/spa-test-dashboard" element={createElement(spaTestDashboard)} />
                
                <Route path="/client-briefing" element={createElement(clientbriefing)} />
                
                <Route path="/client-services" element={createElement(clientservices)} />
                
                <Route path="/e2e-golden-path" element={createElement(e2eGoldenPath)} />
                
                <Route path="/service-templates" element={createElement(servicetemplates)} />
                
                <Route path="/qa-dashboard" element={createElement(qadashboard)} />
                <Route path="/connectivity-dashboard" element={createElement(connectivitydashboard)} />
                <Route path="/briefing-demo" element={createElement(briefingdemo)} />
                <Route path="/service-templates-viewer" element={createElement(serviceTemplatesViewer)} />
                
                <Route path="/settings-agency-categories" element={createElement(settingsAgencyCategories)} />
                
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
