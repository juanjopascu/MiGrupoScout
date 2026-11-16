import { useCallback, useEffect, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import GroupSettingsModal from './components/GroupSettingsModal.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import PushNotificationManager from './components/PushNotificationManager.jsx';
import TeamManagementModal from './components/TeamManagementModal.jsx';
import { applyGroupBrandingToDocument } from './domain/branding.js';
import { canDeleteRecords, normalizeInviteCode } from './domain/roles.js';
import CampPlanner from './pages/CampPlanner.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DocGenerator from './pages/DocGenerator.jsx';
import NormativaChat from './pages/NormativaChat.jsx';
import {
  DEMO_GROUP_ID,
  LS_KEYS,
  clearAllOfflineData,
  getCachedCollection,
  getGroupProfile,
  readLocalPref,
  seedDemoDataIfEmpty,
  writeLocalPref
} from './services/offlineDb.js';
import { detectPushState, unsubscribeFromPush } from './services/pushClient.js';
import {
  getCurrentSession,
  isSupabaseConfigured,
  signOutSupabase,
  supabase
} from './services/supabaseClient.js';
import {
  batchSaveMembersOfflineFirst,
  deleteEntityOfflineFirst,
  initAutoSync,
  isManualOfflineMode,
  pullRemoteSnapshot,
  resolveUserActiveGroup,
  saveEntityOfflineFirst,
  saveGroupProfileOfflineFirst,
  setManualOfflineMode,
  subscribeSyncStatus,
  syncPendingMutations
} from './services/syncEngine.js';
import {
  readPendingInviteCode,
  savePendingInviteCode
} from './services/tenantService.js';

function resolveTabFromPath(pathname) {
  const path = (pathname || '/').toLowerCase();
  if (path.startsWith('/normativa')) return 'normativa';
  if (path.startsWith('/campamentos') || path.startsWith('/salidas')) return 'campamentos';
  if (path.startsWith('/documentos') || path.startsWith('/actas')) return 'documentos';
  return 'dashboard';
}

function pathForTab(tab) {
  if (tab === 'normativa') return '/normativa';
  if (tab === 'campamentos') return '/campamentos';
  if (tab === 'documentos') return '/documentos';
  return '/dashboard';
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() =>
    resolveTabFromPath(typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [manualOffline, setManualOffline] = useState(() => isManualOfflineMode());
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [session, setSession] = useState(null);
  const [demoBypass, setDemoBypass] = useState(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('invite')) {
      return false;
    }
    return Boolean(readLocalPref(LS_KEYS.DEMO_BYPASS, false));
  });
  const [groupId, setGroupId] = useState(DEMO_GROUP_ID);
  const [userRole, setUserRole] = useState('jefe_grupo');
  const [memberships, setMemberships] = useState([]);
  const [hasActiveGroup, setHasActiveGroup] = useState(true);
  const [pendingInviteCode, setPendingInviteCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlInvite = normalizeInviteCode(
        new URLSearchParams(window.location.search).get('invite') || ''
      );
      if (urlInvite) {
        savePendingInviteCode(urlInvite);
        return urlInvite;
      }
    }
    return readPendingInviteCode();
  });
  const [groupProfile, setGroupProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [camps, setCamps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [pushState, setPushState] = useState('checking');
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const [selectedCampId, setSelectedCampId] = useState(null);
  const [preloadedDocCamp, setPreloadedDocCamp] = useState(null);

  const [needRefresh, setNeedRefresh] = useState(false);
  const [syncState, setSyncState] = useState({
    pendingCount: 0,
    conflictCount: 0,
    isSyncing: false,
    lastSyncAt: null
  });

  const loadGroupStateFromCache = useCallback(async (targetGroupId) => {
    const [profile, cachedMembers, cachedCamps, cachedTasks] = await Promise.all([
      getGroupProfile(targetGroupId),
      getCachedCollection('group_members', targetGroupId),
      getCachedCollection('camp_checklists', targetGroupId),
      getCachedCollection('council_tasks', targetGroupId)
    ]);
    setGroupProfile(profile);
    setMembers(cachedMembers);
    setCamps(cachedCamps);
    setTasks(cachedTasks);
  }, []);

  const bootstrap = useCallback(
    async (preferredGroupId = null) => {
      setIsLoadingData(true);
      try {
        initAutoSync();
        const activeSession = await getCurrentSession();
        setSession(activeSession);

        let targetGroupId = DEMO_GROUP_ID;
        let nextRole = 'jefe_grupo';
        let nextMemberships = [];
        let activeRemote = false;

        if (activeSession && isSupabaseConfigured) {
          const resolved = await resolveUserActiveGroup(activeSession, preferredGroupId);
          nextMemberships = resolved?.memberships || [];
          if (resolved?.groupId) {
            targetGroupId = resolved.groupId;
            nextRole = resolved.role || 'educador';
            activeRemote = true;
          } else {
            await seedDemoDataIfEmpty(true);
            setSettingsModalOpen(true);
          }
        } else {
          await seedDemoDataIfEmpty(false);
        }

        setMemberships(nextMemberships);
        setHasActiveGroup(!activeSession || !isSupabaseConfigured || activeRemote);
        setUserRole(nextRole);
        setGroupId(targetGroupId);
        await loadGroupStateFromCache(targetGroupId);

        if (activeSession && targetGroupId !== DEMO_GROUP_ID && navigator.onLine && !isManualOfflineMode()) {
          await syncPendingMutations();
          const remote = await pullRemoteSnapshot(targetGroupId);
          if (remote) {
            setGroupProfile(remote.groupProfile);
            setMembers(remote.members);
            setCamps(remote.camps);
            setTasks(remote.tasks);
          }
        }
      } finally {
        setIsLoadingData(false);
      }
    },
    [loadGroupStateFromCache]
  );

  useEffect(() => {
    applyGroupBrandingToDocument(groupProfile);
  }, [groupProfile]);

  useEffect(() => {
    void bootstrap();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('invite')) {
        setSettingsModalOpen(true);
        params.delete('invite');
        const nextQuery = params.toString();
        const cleanUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
        window.history.replaceState(null, '', cleanUrl);
      }
    }

    const unsubSync = subscribeSyncStatus((nextSync) => {
      setSyncState(nextSync);
    });

    async function refreshPush() {
      const result = await detectPushState();
      setPushState(result.status);
    }
    void refreshPush();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handlePopState = () => {
      setActiveTab(resolveTabFromPath(window.location.pathname));
    };
    const handleNeedRefresh = () => setNeedRefresh(true);
    const handleSwMessage = (event) => {
      if (event.data?.type === 'PUSH_NAVIGATE' && typeof event.data.url === 'string') {
        const nextTab = resolveTabFromPath(event.data.url);
        setActiveTab(nextTab);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('consejoscout:sw-need-refresh', handleNeedRefresh);
    navigator.serviceWorker?.addEventListener?.('message', handleSwMessage);

    let authSub = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession || null);
      });
      authSub = data?.subscription || null;
    }

    return () => {
      unsubSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('consejoscout:sw-need-refresh', handleNeedRefresh);
      navigator.serviceWorker?.removeEventListener?.('message', handleSwMessage);
      authSub?.unsubscribe?.();
    };
  }, [bootstrap]);

  function handleSelectTab(tab) {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.history?.pushState) {
      const nextPath = pathForTab(tab);
      if (window.location.pathname !== nextPath) {
        window.history.pushState(null, '', nextPath);
      }
    }
  }

  async function handleSaveGroupProfile(nextProfile) {
    const saved = await saveGroupProfileOfflineFirst(nextProfile);
    setGroupProfile(saved);
  }

  async function handleSaveTask(taskPayload) {
    const { list } = await saveEntityOfflineFirst({
      table: 'council_tasks',
      groupId,
      record: taskPayload,
      isNewHint: !taskPayload.id
    });
    setTasks(list);
  }

  async function handleDeleteTask(taskId) {
    const list = await deleteEntityOfflineFirst({
      table: 'council_tasks',
      groupId,
      recordId: taskId
    });
    setTasks(list);
  }

  async function handleSaveMember(memberPayload) {
    const { list } = await saveEntityOfflineFirst({
      table: 'group_members',
      groupId,
      record: memberPayload,
      isNewHint: !memberPayload.id
    });
    setMembers(list);
  }

  async function handleBatchImportMembers(records) {
    const { list } = await batchSaveMembersOfflineFirst({
      groupId,
      records
    });
    setMembers(list);
  }

  async function handleDeleteMember(memberId) {
    const list = await deleteEntityOfflineFirst({
      table: 'group_members',
      groupId,
      recordId: memberId
    });
    setMembers(list);
  }

  async function handleSaveCamp(campPayload) {
    const { record, list } = await saveEntityOfflineFirst({
      table: 'camp_checklists',
      groupId,
      record: campPayload,
      isNewHint: !campPayload.id
    });
    setCamps(list);
    return record;
  }

  async function handleDeleteCamp(campId) {
    const list = await deleteEntityOfflineFirst({
      table: 'camp_checklists',
      groupId,
      recordId: campId
    });
    setCamps(list);
  }

  async function handleAuthChanged(nextSession) {
    setSession(nextSession);
    setDemoBypass(false);
    writeLocalPref(LS_KEYS.DEMO_BYPASS, false);
    await bootstrap();
  }

  function handleContinueDemo() {
    setDemoBypass(true);
    writeLocalPref(LS_KEYS.DEMO_BYPASS, true);
  }

  function handleOpenAuthScreen() {
    setDemoBypass(false);
    writeLocalPref(LS_KEYS.DEMO_BYPASS, false);
  }

  async function handleTenantReady(newGroupId) {
    setPendingInviteCode('');
    savePendingInviteCode('');
    setDemoBypass(false);
    writeLocalPref(LS_KEYS.DEMO_BYPASS, false);
    if (newGroupId) {
      writeLocalPref(LS_KEYS.ACTIVE_GROUP_ID, newGroupId);
    }
    setSettingsModalOpen(false);
    await bootstrap(newGroupId || null);
  }

  async function handleSwitchGroup(nextGroupId) {
    if (!nextGroupId) {
      return;
    }
    writeLocalPref(LS_KEYS.ACTIVE_GROUP_ID, nextGroupId);
    await bootstrap(nextGroupId);
  }

  async function handleLogout() {
    await unsubscribeFromPush({ session });
    await signOutSupabase();
    await clearAllOfflineData();
    setSession(null);
    setDemoBypass(false);
    setManualOffline(false);
    setSyncFeedback(null);
    setMemberships([]);
    setUserRole('jefe_grupo');
    setHasActiveGroup(true);
    setPushState('default');
    setSettingsModalOpen(false);
    setTeamModalOpen(false);
    await bootstrap();
  }

  function handleToggleManualOffline() {
    const next = !manualOffline;
    setManualOffline(next);
    setManualOfflineMode(next);
    if (next) {
      setSyncFeedback({
        type: 'warning',
        text: 'Modo sin conexion activado. Toda consulta o cambio quedara guardado en este dispositivo.'
      });
    } else if (isOnline) {
      void handleManualSync();
    } else {
      setSyncFeedback({
        type: 'warning',
        text: 'El dispositivo sigue sin senal de internet. Los datos siguen accesibles en local.'
      });
    }
  }

  async function handleManualSync() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncFeedback({
        type: 'warning',
        text: 'Seguís sin conexion a internet. Tus cambios permanecen guardados en el dispositivo.'
      });
      return;
    }

    if (manualOffline) {
      setManualOffline(false);
      setManualOfflineMode(false);
    }

    if (!session || !isSupabaseConfigured || groupId === DEMO_GROUP_ID) {
      setSyncFeedback({
        type: 'success',
        text: 'Datos locales verificados. Inicia sesion con tu cuenta de Grupo para sincronizar en la nube.'
      });
      return;
    }

    const syncResult = await syncPendingMutations({ ignoreManualOffline: true });
    const remote = await pullRemoteSnapshot(groupId);
    if (remote) {
      setGroupProfile(remote.groupProfile);
      setMembers(remote.members);
      setCamps(remote.camps);
      setTasks(remote.tasks);
    }

    const applied = syncResult?.syncedCount || 0;
    if (syncResult?.conflictCount > 0) {
      setSyncFeedback({
        type: 'warning',
        text: `Sincronizacion parcial: ${applied} cambios aplicados y ${syncResult.conflictCount} conflicto(s) pendiente(s).`
      });
    } else if (applied > 0) {
      setSyncFeedback({
        type: 'success',
        text: `Sincronizacion completa: se aplicaron ${applied} cambio(s) y se actualizo el Grupo.`
      });
    } else {
      setSyncFeedback({
        type: 'success',
        text: 'Todo sincronizado y actualizado con la nube.'
      });
    }
  }

  function handleAcceptSwUpdate() {
    window.dispatchEvent(new CustomEvent('consejoscout:sw-apply-update'));
    setNeedRefresh(false);
  }

  const effectiveIsOnline = isOnline && !manualOffline;
  const isDemoMode = !session || !isSupabaseConfigured || !hasActiveGroup;
  const shouldShowAuthScreen =
    !isLoadingData && !demoBypass && (!session || !hasActiveGroup);

  if (shouldShowAuthScreen) {
    return (
      <ErrorBoundary>
        <AuthScreen
          session={session}
          isOnline={effectiveIsOnline}
          pendingInviteCode={pendingInviteCode}
          hasActiveGroup={hasActiveGroup}
          onAuthChanged={handleAuthChanged}
          onTenantReady={handleTenantReady}
          onContinueDemo={handleContinueDemo}
          onLogout={handleLogout}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        groupProfile={groupProfile}
        userRole={userRole}
        isDemoMode={isDemoMode}
        isAuthenticated={Boolean(session)}
        isOnline={effectiveIsOnline}
        networkOnline={isOnline}
        manualOffline={manualOffline}
        onToggleManualOffline={handleToggleManualOffline}
        onManualSync={handleManualSync}
        syncFeedback={syncFeedback}
        onDismissSyncFeedback={() => setSyncFeedback(null)}
        pushState={pushState}
        onOpenPushManager={() => setPushModalOpen(true)}
        onOpenTeamManager={() => setTeamModalOpen(true)}
        onOpenAuthScreen={handleOpenAuthScreen}
        onOpenSettings={() => setSettingsModalOpen(true)}
        syncState={syncState}
        needRefresh={needRefresh}
        onAcceptSwUpdate={handleAcceptSwUpdate}
        onDismissSwUpdate={() => setNeedRefresh(false)}
      >
        {isLoadingData ? (
          <div className="space-y-4 animate-pulse py-4" aria-label="Cargando datos del Grupo">
            <div className="h-8 w-56 rounded-lg bg-slate-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-36 rounded-xl bg-slate-200" />
              <div className="h-36 rounded-xl bg-slate-200" />
              <div className="h-36 rounded-xl bg-slate-200" />
            </div>
            <div className="h-64 rounded-xl bg-slate-200" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                groupProfile={groupProfile}
                userRole={userRole}
                isDemoMode={isDemoMode}
                hasActiveGroup={hasActiveGroup}
                members={members}
                camps={camps}
                tasks={tasks}
                pushState={pushState}
                onOpenPushManager={() => setPushModalOpen(true)}
                onOpenTeamManager={() => setTeamModalOpen(true)}
                onOpenSettings={() => setSettingsModalOpen(true)}
                onOpenCampPlanner={(campId) => {
                  setSelectedCampId(campId);
                  handleSelectTab('campamentos');
                }}
                onSaveTask={handleSaveTask}
                onDeleteTask={handleDeleteTask}
                onSaveMember={handleSaveMember}
                onBatchImportMembers={handleBatchImportMembers}
                onDeleteMember={handleDeleteMember}
              />
            )}

            {activeTab === 'normativa' && (
              <NormativaChat
                isOnline={effectiveIsOnline}
                onNavigateToCampPlanner={() => handleSelectTab('campamentos')}
                onNavigateToDocGenerator={() => handleSelectTab('documentos')}
              />
            )}

            {activeTab === 'campamentos' && (
              <CampPlanner
                camps={camps}
                selectedCampId={selectedCampId}
                onSelectCampId={setSelectedCampId}
                onSaveCamp={handleSaveCamp}
                onDeleteCamp={
                  isDemoMode || canDeleteRecords(userRole) ? handleDeleteCamp : undefined
                }
                pushState={pushState}
                onOpenPushManager={() => setPushModalOpen(true)}
                onOpenDocGeneratorWithCamp={(campData) => {
                  setPreloadedDocCamp(campData);
                  handleSelectTab('documentos');
                }}
              />
            )}

            {activeTab === 'documentos' && (
              <DocGenerator
                groupProfile={groupProfile}
                camps={camps}
                preloadedCamp={preloadedDocCamp}
                onClearPreloadedCamp={() => setPreloadedDocCamp(null)}
              />
            )}
          </>
        )}
      </AppShell>

      <InstallPrompt />

      <PushNotificationManager
        isOpen={pushModalOpen}
        onClose={() => setPushModalOpen(false)}
        groupId={groupId}
        session={session}
        pushState={pushState}
        onPushStateChange={setPushState}
      />

      <TeamManagementModal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        groupId={groupId}
        groupProfile={groupProfile}
        userRole={userRole}
        currentUserId={session?.user?.id || null}
        isDemoMode={isDemoMode}
      />

      <GroupSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        groupProfile={groupProfile}
        onSaveGroupProfile={handleSaveGroupProfile}
        session={session}
        userRole={userRole}
        memberships={memberships}
        activeGroupId={groupId}
        hasActiveGroup={hasActiveGroup}
        pendingInviteCode={pendingInviteCode}
        onSwitchGroup={handleSwitchGroup}
        onOpenTeamManager={() => setTeamModalOpen(true)}
        onAuthChanged={handleAuthChanged}
        onTenantReady={handleTenantReady}
        onLogout={handleLogout}
        syncState={syncState}
        onManualSync={handleManualSync}
        isOnline={effectiveIsOnline}
        networkOnline={isOnline}
        manualOffline={manualOffline}
        onToggleManualOffline={handleToggleManualOffline}
      />
    </ErrorBoundary>
  );
}
