import React, { useState, useSyncExternalStore } from 'react';
import { X, Search, FolderGit2, Trash2, ArrowRight, Clock, FileCode } from 'lucide-react';
import { projectsStore } from '../../store/projects';
import { uiStore } from '../../store/ui';

interface ProjectLibraryProps {
  onSelectProject: () => void;
}

export const ProjectLibrary: React.FC<ProjectLibraryProps> = ({ onSelectProject }) => {
  const projects = useSyncExternalStore(projectsStore.subscribe, projectsStore.getSnapshot);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.savedProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.files.some(f => f.path.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpen = async (id: string) => {
    const ok = await projectsStore.loadProject(id);
    if (ok) {
      uiStore.setLibraryOpen(false);
      onSelectProject();
      uiStore.showToast('تم فتح المشروع بنجاح!', 'success');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف مشروع "${name}" نهائياً من المكتبة؟`)) {
      await projectsStore.deleteProject(id);
      uiStore.showToast('تم حذف المشروع من المكتبة', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-sm">
      <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl shadow-2xl max-w-sm w-full flex flex-col max-h-[85vh] overflow-hidden text-light-text dark:text-dark-text text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-light-border dark:border-dark-border bg-light-bg/50 dark:bg-dark-bg/50">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm">مكتبة المشاريع المحفوظة</h3>
          </div>
          <button
            onClick={() => uiStore.setLibraryOpen(false)}
            className="p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-2.5 border-b border-light-border dark:border-dark-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-light-muted dark:text-dark-muted" />
            <input
              type="text"
              placeholder="بحث في المشاريع والملفات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {projects.isLoading ? (
            <div className="text-center py-8 text-light-muted dark:text-dark-muted">جارٍ تحميل المشاريع...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-light-muted dark:text-dark-muted space-y-1">
              <p>لا توجد مشاريع محفوظة تطابق البحث.</p>
              <p className="text-[11px]">احفظ مشروعك من شاشة المراجعة للرجوع إليه هنا في أي وقت.</p>
            </div>
          ) : (
            filteredProjects.map((p) => {
              const dateStr = new Date(p.updatedAt).toLocaleDateString('ar-SA', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const versionsCount = p.versions?.length || 1;

              return (
                <div
                  key={p.id}
                  className="p-2.5 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg/60 hover:border-blue-500/50 transition flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs truncate">{p.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-light-muted dark:text-dark-muted mt-1">
                      <span className="flex items-center gap-0.5">
                        <FileCode className="w-3 h-3" />
                        <span>{p.files.length} ملف</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                      {versionsCount > 1 && (
                        <>
                          <span>•</span>
                          <span className="bg-blue-500/10 text-blue-500 px-1 rounded font-mono">
                            v{versionsCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpen(p.id)}
                      className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 text-[11px]"
                      title="فتح المشروع"
                    >
                      <span>فتح</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 rounded-md text-red-500 hover:bg-red-500/10 transition"
                      title="حذف المشروع"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
