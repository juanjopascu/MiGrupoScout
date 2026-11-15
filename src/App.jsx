import { useCallback, useEffect, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import GroupSettingsModal from './components/GroupSettingsModal.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import PushNotificationManager from './components/PushNotificationManager.jsx';
import CampPlanner from './pages/CampPlanner.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DocGenerator from './pages/DocGenerator.jsx';
import NormativaChat from './pages/NormativaChat.jsx';
import {
  DEMO_GROUP_ID,
  clearAllOfflineData,
  getCachedCollection,
  getGroupProfile,
  seedDemoDataIfEmpty
} from './services/offlineDb.js';
import { detectPushState, unsubscribeFromPush } from './services/pushClient.js';
import {
  getCurrentSession,
  isSupabaseConfigured,
  signOutSupabase,
  supabase
} from './services/supabaseClient.js';
import {
  deleteEntityOfflineFirst,
  initAutoSync,
  pullRemoteSnapshot,
  resolveUserActiveGroup,
  saveEntityOfflineFirst,
  saveGroupProfileOfflineFirst,
  subscribeSyncStatus,
  syncPendingMutations
} from './services/syncEngine.js';

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
  const [session, setSession] = useState(null);
  const [groupId, setGroupId] = useState(DEMO_GROUP_ID);
  const [groupProfile, setGroupProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [camps, setCamps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [pushState, setPushState] = useState('checking');
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

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

  const bootstrap = useCallback(async () => {
    setIsLoadingData(true);
    try {
      initAutoSync();
      const activeSession = await getCurrentSession();
      setSession(activeSession);

      let targetGroupId = DEMO_GROUP_ID;

      if (activeSession && isSupabaseConfigured) {
        const resolved = await resolveUserActiveGroup(activeSession);
        if (resolved?.groupId) {
          targetGroupId = resolved.groupId;
        }
      } else {
        await seedDemoDataIfEmpty(false);
      }

      setGroupId(targetGroupId);
      await loadGroupStateFromCache(targetGroupId);

      if (activeSession && targetGroupId !== DEMO_GROUP_ID && navigator.onLine) {
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
  }, [loadGroupStateFromCache]);

  useEffect(() => {
    void bootstrap();

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
    await bootstrap();
  }

  async function handleLogout() {
    await unsubscribeFromPush({ session });
    await signOutSupabase();
    await clearAllOfflineData();
    setSession(null);
    setPushState('default');
    setSettingsModalOpen(false);
    await bootstrap();
  }

  async function handleManualSync() {
    await syncPendingMutations();
    if (groupId !== DEMO_GROUP_ID) {
      const remote = await pullRemoteSnapshot(groupId);
      if (remote) {
        setGroupProfile(remote.groupProfile);
        setMembers(remote.members);
        setCamps(remote.camps);
        setTasks(remote.tasks);
      }
    }
  }

  function handleAcceptSwUpdate() {
    window.dispatchEvent(new CustomEvent('consejoscout:sw-apply-update'));
    setNeedRefresh(false);
  }

  return (
    <ErrorBoundary>
      <AppShell
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        groupProfile={groupProfile}
        isOnline={isOnline}
        pushState={pushState}
        onOpenPushManager={() => setPushModalOpen(true)}
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
                members={members}
                camps={camps}
                tasks={tasks}
                pushState={pushState}
                onOpenPushManager={() => setPushModalOpen(true)}
                onOpenCampPlanner={(campId) => {
                  setSelectedCampId(campId);
                  handleSelectTab('campamentos');
                }}
                onSaveTask={handleSaveTask}
                onDeleteTask={handleDeleteTask}
                onSaveMember={handleSaveMember}
                onDeleteMember={handleDeleteMember}
              />
            )}

            {activeTab === 'normativa' && (
              <NormativaChat
                isOnline={isOnline}
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
                onDeleteCamp={handleDeleteCamp}
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

      <GroupSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        groupProfile={groupProfile}
        onSaveGroupProfile={handleSaveGroupProfile}
        session={session}
        onAuthChanged={handleAuthChanged}
        onLogout={handleLogout}
        syncState={syncState}
        onManualSync={handleManualSync}
        isOnline={isOnline}
      />
    </ErrorBoundary>
  );
}
