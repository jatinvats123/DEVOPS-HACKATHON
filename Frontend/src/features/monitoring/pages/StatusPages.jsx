import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiRefreshLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiFileCopyLine,
} from '@remixicon/react';
import {
  getStatusPages,
  createStatusPage,
  updateStatusPage,
  deleteStatusPage,
} from '../services/statusPage.api';
import { getMonitors } from '../services/monitor.api';
import Notification from '../../../components/Notification';
import EmptyState from '../../../components/ui/EmptyState';

/**
 * Status pages.
 *
 * This screen was previously a static mockup: two hard-coded pages for
 * "acme.com", invented uptime figures, and no click handler on either the
 * "Create Page" button or the "Add Status Page" card. Nothing here talked to
 * the backend, because there was no backend for it to talk to.
 */

const slugPreview = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const publicUrlFor = (slug) => `${window.location.origin}/status/${slug}`;

const emptyForm = {
  name: '',
  description: '',
  monitors: [],
  isPublic: true,
};

const StatusPages = () => {
  const [pages, setPages] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [editor, setEditor] = useState(null); // null | {mode, pageId, form}
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pageRes, monitorRes] = await Promise.allSettled([
        getStatusPages(),
        getMonitors(),
      ]);

      if (pageRes.status === 'fulfilled') {
        setPages(pageRes.value?.data || []);
      } else {
        setNotification({
          message: 'Failed to load status pages',
          type: 'error',
        });
      }

      if (monitorRes.status === 'fulfilled') {
        const payload = monitorRes.value?.data;
        setMonitors(Array.isArray(payload) ? payload : payload?.monitors || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () =>
    setEditor({ mode: 'create', form: { ...emptyForm } });

  const openEdit = (page) =>
    setEditor({
      mode: 'edit',
      pageId: page._id,
      form: {
        name: page.name || '',
        description: page.description || '',
        monitors: (page.monitors || []).map((m) =>
          typeof m === 'string' ? m : m._id
        ),
        isPublic: page.isPublic !== false,
      },
    });

  const setField = (key, value) =>
    setEditor((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));

  const toggleMonitor = (monitorId) =>
    setEditor((prev) => {
      const chosen = prev.form.monitors;
      return {
        ...prev,
        form: {
          ...prev.form,
          monitors: chosen.includes(monitorId)
            ? chosen.filter((id) => id !== monitorId)
            : [...chosen, monitorId],
        },
      };
    });

  const onSubmit = async (e) => {
    e.preventDefault();
    const { form, mode, pageId } = editor;

    if (!form.name.trim()) {
      setNotification({ message: 'Name is required', type: 'error' });
      return;
    }
    if (!slugPreview(form.name)) {
      setNotification({
        message: 'Name needs at least one letter or number',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        monitors: form.monitors,
        isPublic: form.isPublic,
      };

      if (mode === 'create') {
        await createStatusPage(payload);
      } else {
        // The slug is intentionally not sent on edit: renaming a page must not
        // silently move its public URL and break links already shared.
        await updateStatusPage(pageId, payload);
      }

      setEditor(null);
      setNotification({
        message:
          mode === 'create' ? 'Status page created' : 'Status page saved',
        type: 'success',
      });
      load();
    } catch (err) {
      setNotification({
        message:
          err.response?.data?.message ||
          `Failed to ${editor.mode === 'create' ? 'create' : 'save'} status page`,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (page) => {
    if (
      !window.confirm(
        `Delete "${page.name}"? The public address /status/${page.slug} will stop working.`
      )
    ) {
      return;
    }
    setBusyId(page._id);
    try {
      await deleteStatusPage(page._id);
      setPages((list) => list.filter((p) => p._id !== page._id));
      setNotification({ message: 'Status page deleted', type: 'success' });
    } catch (err) {
      setNotification({
        message: err.response?.data?.message || 'Failed to delete status page',
        type: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (page) => {
    const url = publicUrlFor(page.slug);
    try {
      await navigator.clipboard.writeText(url);
      setNotification({ message: 'Public link copied', type: 'success' });
    } catch {
      // Clipboard access is denied in some browsers/contexts; show the URL so
      // it can still be copied by hand rather than failing silently.
      setNotification({ message: url, type: 'success' });
    }
  };

  const monitorById = useMemo(
    () => new Map(monitors.map((m) => [m._id, m])),
    [monitors]
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 luxury-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
        <div>
          <h1 className="luxury-heading text-2xl sm:text-3xl lg:text-4xl">
            Status Pages
          </h1>
          <p className="luxury-subtext mt-3 max-w-md">
            Public-facing communication channels for service health and incident
            reporting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="luxury-button-outline flex items-center gap-2"
          >
            <RiRefreshLine
              className={`w-5 h-5 ${loading ? 'animate-spin text-[#cc785c]' : ''}`}
            />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="luxury-button-primary flex items-center gap-3 px-8"
          >
            <RiAddLine className="w-5 h-5" /> Create Page
          </button>
        </div>
      </div>

      {loading && pages.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#cc785c]" />
        </div>
      ) : pages.length === 0 ? (
        <EmptyState
          title="No status pages yet"
          description="A status page gives your customers one link to check during an incident, without asking you."
          action={
            <button onClick={openCreate} className="luxury-button-primary px-8">
              Create your first status page
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {pages.map((page) => {
            const services = (page.monitors || []).map((m) =>
              typeof m === 'string' ? monitorById.get(m) : m
            );
            const down = services.filter((m) => m?.status === 'DOWN').length;

            return (
              <div
                key={page._id}
                className="luxury-card group hover:border-[#cc785c]/30 transition-all duration-300"
              >
                <div className="flex justify-between items-start gap-4 mb-8">
                  <div className="min-w-0">
                    <h3 className="luxury-heading text-2xl mb-2 break-words">
                      {page.name}
                    </h3>
                    <p className="text-sm text-[#6c6a64] font-mono break-all">
                      /status/{page.slug}
                    </p>
                  </div>
                  <span
                    className={`luxury-badge shrink-0 ${
                      !page.isPublic
                        ? 'bg-[#e6dfd8]/40 text-[#6c6a64]'
                        : down > 0
                          ? 'bg-red-50 text-red-600'
                          : 'bg-[#cc785c]/10 text-[#cc785c]'
                    }`}
                  >
                    {!page.isPublic
                      ? 'Unpublished'
                      : down > 0
                        ? `${down} down`
                        : 'Operational'}
                  </span>
                </div>

                {page.description && (
                  <p className="luxury-subtext mb-8">{page.description}</p>
                )}

                <div className="mb-8">
                  <p className="luxury-label mb-3">
                    {services.length} monitor{services.length === 1 ? '' : 's'}
                  </p>
                  {services.length === 0 ? (
                    <p className="text-sm text-[#6c6a64]">
                      No monitors on this page yet — visitors will see an empty
                      page.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {services.map((m, i) => (
                        <li
                          key={m?._id || i}
                          className="text-xs px-3 py-1.5 rounded-full bg-[#faf9f5] border border-[#e6dfd8] text-[#3d3d3a]"
                        >
                          {m?.title || 'Unknown monitor'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#e6dfd8]">
                  <button
                    onClick={() => copyLink(page)}
                    className="text-xs font-semibold text-[#6c6a64] hover:text-[#141413] flex items-center gap-1.5"
                  >
                    <RiFileCopyLine className="w-3.5 h-3.5" /> Copy link
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => onDelete(page)}
                      disabled={busyId === page._id}
                      className="luxury-button-outline py-2 px-4 text-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RiDeleteBinLine className="w-3.5 h-3.5" /> Delete
                    </button>
                    <button
                      onClick={() => openEdit(page)}
                      className="luxury-button-outline py-2 px-6 text-sm"
                    >
                      Edit
                    </button>
                    <a
                      href={`/status/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="luxury-button-primary py-2 px-6 text-sm flex items-center gap-1.5"
                    >
                      View Public <RiExternalLinkLine className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setEditor(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-[#e6dfd8] rounded-2xl p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sp-dialog-title"
          >
            <h3 className="luxury-heading text-2xl mb-8" id="sp-dialog-title">
              {editor.mode === 'create'
                ? 'Create status page'
                : 'Edit status page'}
            </h3>

            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label className="luxury-label" htmlFor="sp-name">
                  Name
                </label>
                <input
                  id="sp-name"
                  value={editor.form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Acme API Status"
                  autoFocus
                  className="w-full mt-2 p-3 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413]"
                />
                {editor.mode === 'create' && (
                  <p className="text-xs text-[#6c6a64] mt-2 font-mono break-all">
                    {slugPreview(editor.form.name)
                      ? publicUrlFor(slugPreview(editor.form.name))
                      : 'The public address is built from the name.'}
                  </p>
                )}
                {editor.mode === 'edit' && (
                  <p className="text-xs text-[#6c6a64] mt-2">
                    The public address does not change when you rename a page,
                    so links you have already shared keep working.
                  </p>
                )}
              </div>

              <div>
                <label className="luxury-label" htmlFor="sp-description">
                  Description <span className="normal-case">(optional)</span>
                </label>
                <input
                  id="sp-description"
                  value={editor.form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Live availability for our public API"
                  maxLength={280}
                  className="w-full mt-2 p-3 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413]"
                />
              </div>

              <fieldset>
                <legend className="luxury-label mb-2">Monitors to show</legend>
                {monitors.length === 0 ? (
                  <p className="text-sm text-[#6c6a64]">
                    You have no monitors yet. Create one first, then add it
                    here.
                  </p>
                ) : (
                  <div className="max-h-52 overflow-y-auto border border-[#e6dfd8] rounded-xl divide-y divide-[#e6dfd8]">
                    {monitors.map((m) => (
                      <label
                        key={m._id}
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#faf9f5]"
                      >
                        <input
                          type="checkbox"
                          checked={editor.form.monitors.includes(m._id)}
                          onChange={() => toggleMonitor(m._id)}
                          className="w-4 h-4 accent-[#cc785c]"
                        />
                        <span className="text-sm text-[#141413] truncate">
                          {m.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#6c6a64] mt-2">
                  Only the display name and up/down state are published — never
                  the monitored URL or any credentials.
                </p>
              </fieldset>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editor.form.isPublic}
                  onChange={(e) => setField('isPublic', e.target.checked)}
                  className="w-4 h-4 accent-[#cc785c]"
                />
                <span className="text-sm text-[#3d3d3a]">
                  Publish — anyone with the link can view this page
                </span>
              </label>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="luxury-button-primary px-8 disabled:opacity-60"
                >
                  {saving
                    ? 'Saving…'
                    : editor.mode === 'create'
                      ? 'Create page'
                      : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  disabled={saving}
                  className="luxury-button-outline px-8"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPages;
