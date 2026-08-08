import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Menu, X, MessageCircle, Info, Lock, ChevronDown,
    User, Bot, AlertTriangle, LogOut, Clock, RefreshCw, Paperclip,
} from 'lucide-react';
import { roomService } from '../../../services/roomService';
import { discordMdToHtml, shouldStyleMessage } from './markdownRenderer';
import styles from './ChatRoom.module.css';

// Xentra logo resource URL served by the backend
const XENTRA_LOGO_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') + '/resources/xentra_logo/image/';

// Number of transcript entries fetched per lazy-load chunk (older messages)
const CHUNK_SIZE = 25;

/* ═══════════════════════════════════════════════════════════════════════════
   ChatRoom, Premium-only live chat room page for Client & Freelancer
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Helper: format timestamp ──────────────────────────────────────────────
function formatTime(ts) {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

function formatDate(ts) {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return ''; }
}

function formatRelativeTime(ts) {
    if (!ts) return '';
    try {
        const now = Date.now();
        const then = new Date(ts).getTime();
        const diff = now - then;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return formatDate(ts);
    } catch { return ''; }
}

// ── Helper: attachment tag label (parity with PDF generator) ──────────────
function attachmentTagText(metadata) {
    const raw = String(metadata == null ? '' : metadata).trim();
    if (!raw) return '';

    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }

    if (parsed === null) {
        // Plain string: "Shared 1 file(s) (a.pdf)" -> "Shared 1 file(s) [a.pdf]"
        // Only the LAST (...) group (the file names) becomes square brackets;
        // "file(s)" keeps its round brackets.
        const m = /^(.*?)(\([^()]*\))$/.exec(raw);
        if (m) return `${m[1].replace(/\s+$/, '')} [${m[2].slice(1, -1)}]`;
        return raw;
    }
    if (Array.isArray(parsed)) {
        const names = [];
        for (const item of parsed) {
            if (item && typeof item === 'object' && item.filename) names.push(String(item.filename));
            else if (typeof item === 'string') names.push(item);
        }
        if (!names.length) return raw;
        return `Shared ${names.length} file(s) [${names.join(', ')}]`;
    }
    if (parsed && typeof parsed === 'object' && parsed.filename) {
        return `Shared 1 file(s) [${String(parsed.filename)}]`;
    }
    return raw;
}

// ── Gold Dust Particles ───────────────────────────────────────────────────
function GoldDust() {
    return (
        <div className={styles.goldDust}>
            {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className={styles.goldDustParticle} />
            ))}
        </div>
    );
}

// ── Avatar Component ──────────────────────────────────────────────────────
function Avatar({ url, name, sender, size = 32 }) {
    const [imgError, setImgError] = useState(false);

    // Default to Xentra logo URL for bot/system senders when no url is provided
    const effectiveUrl = url || ((sender === 'bot' || sender === 'system') ? XENTRA_LOGO_URL : null);
    const initial = (name || sender || '?')[0].toUpperCase();

    const fallbackClass = sender === 'client'
        ? styles.avatarFallbackClient
        : sender === 'freelancer'
            ? styles.avatarFallbackFreelancer
            : styles.avatarFallbackBot;

    return (
        <div className={styles.avatar} style={{ width: size, height: size }}>
            {effectiveUrl && !imgError ? (
                <img
                    className={styles.avatarImg}
                    src={effectiveUrl}
                    alt={name || sender}
                    onError={() => setImgError(true)}
                    loading="lazy"
                />
            ) : (
                <div className={`${styles.avatarFallback} ${fallbackClass}`}>
                    {initial}
                </div>
            )}
        </div>
    );
}

// ── Reply Preview Strip ───────────────────────────────────────────────────
function ReplyPreview({ reply }) {
    if (!reply) return null;
    const senderLabel = String(reply.sender || 'system');
    const prettySender = senderLabel.charAt(0).toUpperCase() + senderLabel.slice(1);
    return (
        <div className={styles.replyPreview}>
            <div className={styles.replyAccent} />
            <p className={styles.replySender}>{prettySender}</p>
            <p className={styles.replyText}>{reply.data || ''}</p>
        </div>
    );
}

// ── Attachment Tag ────────────────────────────────────────────────────────
function AttachmentTag({ metadata }) {
    const label = attachmentTagText(metadata);
    if (!label) return null;
    return (
        <div className={styles.attachmentTag}>
            <Paperclip size={10} className={styles.attachmentTagIcon} />
            <span>{label}</span>
        </div>
    );
}

// ── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, viewerRole, isPremium }) {
    const isSelf = msg.sender === viewerRole;

    // Bubble colour precedence — exact replica of the PDF generator's
    // ``_bubble_colors`` (closure → bot/system → complain →
    // /interview_leave command → other command → self → other).
    let bubbleClass = styles.bubbleOther;
    if (msg.type === 'closure') bubbleClass = styles.bubbleLeave;
    else if (msg.sender === 'bot' || msg.sender === 'system') bubbleClass = styles.bubbleBot;
    else if (msg.type === 'complain') bubbleClass = styles.bubbleComplain;
    else if (msg.is_command && String(msg.command_name || '').replace(/^\/+/, '') === 'interview_leave') bubbleClass = styles.bubbleLeave;
    else if (msg.is_command) bubbleClass = styles.bubbleCommand;
    else if (isSelf) bubbleClass = styles.bubbleSelf;

    const senderName = msg.sender === 'client'
        ? 'Client'
        : msg.sender === 'freelancer'
            ? 'Freelancer'
            : msg.sender === 'bot'
                ? 'Xentra Bot'
                : 'System';

    return (
        <div className={`${styles.messageRow} ${isSelf ? styles.messageRowSelf : styles.messageRowOther}`}>
            {!isSelf && (
                <Avatar
                    url={msg.avatar_url}
                    name={senderName}
                    sender={msg.sender}
                />
            )}
            <div className={`${styles.bubble} ${bubbleClass} ${styles.bubbleFlash} ${isPremium ? styles.premiumBubble : ''}`}>
                {msg.is_command && msg.command_name && (
                    <div className={styles.commandBadge}>/{msg.command_name}</div>
                )}
                {msg.type === 'complain' && !msg.is_command && (
                    <div className={styles.complainBadge}>
                        <AlertTriangle size={10} className={styles.complainBadgeIcon} />
                        Complaint
                    </div>
                )}
                <ReplyPreview reply={msg.reply_preview} />
                <AttachmentTag metadata={msg.attachment_metadata} />
                {shouldStyleMessage(msg.sender, msg.data) ? (
                    <div
                        className={`${styles.bubbleText} ${styles.mdContent}`}
                        dangerouslySetInnerHTML={{ __html: discordMdToHtml(msg.data) }}
                    />
                ) : (
                    <p className={styles.bubbleText}>{msg.data}</p>
                )}
                <div className={styles.bubbleTimestamp}>{formatTime(msg.timestamp)}</div>
            </div>
            {isSelf && (
                <Avatar
                    url={msg.avatar_url}
                    name={senderName}
                    sender={msg.sender}
                />
            )}
        </div>
    );
}

// ── Closure Notice ───────────────────────────────────────────────────────
function ClosureNotice({ msg }) {
    const name = msg.sender === 'client' ? 'Client' : msg.sender === 'freelancer' ? 'Freelancer' : 'System';
    const closureType = msg.closure_type || 'leave';

    let titleText;
    if (closureType === 'agreement') {
        titleText = 'Room concluded — agreement reached';
    } else if (closureType === 'system') {
        titleText = 'Room closed by system';
    } else {
        titleText = `${name} left the room`;
    }

    return (
        <div className={styles.messageRowClosure}>
            <div className={styles.closureNoticeCard}>
                <p className={styles.closureNoticeTitle}>
                    <LogOut size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {titleText}
                </p>
                {msg.data && <p className={styles.closureNoticeReason}>{msg.data}</p>}
                <p className={styles.closureNoticeTime}>{formatTime(msg.timestamp)}</p>
            </div>
        </div>
    );
}

// ── Date Divider ──────────────────────────────────────────────────────────
function DateDivider({ label, isPremium }) {
    return (
        <div className={`${styles.dateDivider} ${isPremium ? styles.dateDividerPremium : ''}`}>
            <div className={styles.dateDividerPill}>{label}</div>
        </div>
    );
}

// ── Skeleton Avatar (uses real profile image or shimmer fallback) ──────────
function SkeletonAvatar({ url, className }) {
    if (url) {
        return (
            <div className={`${styles.skeletonAvatar} ${className || ''}`}>
                <img src={url} alt="" className={styles.avatarImg} />
            </div>
        );
    }
    return <div className={`${styles.skeletonAvatar} ${className || ''}`} />;
}

// ── Refresh Chat Skeleton (8-msg bubbles, chat box only) ──────────────────
function RefreshChatSkeleton({ profile }) {
    const avatarUrl = profile?.avatar_url || null;
    const rows = [
        { w: '55%', right: false },
        { w: '70%', right: true },
        { w: '40%', right: false },
        { w: '60%', right: true },
        { w: '45%', right: false },
        { w: '65%', right: false },
        { w: '50%', right: true },
        { w: '55%', right: false },
    ];
    return (
        <div className={styles.messagesContainer}>
            {rows.map((r, i) => (
                <div key={i} className={`${styles.skeletonBubble} ${r.right ? styles.skeletonBubbleRight : ''}`}>
                    {!r.right && <SkeletonAvatar url={avatarUrl} />}
                    <div className={styles.skeletonBubbleBox} style={{ width: r.w }}>
                        <div className={styles.skeletonBubbleBoxLine} />
                        <div className={styles.skeletonBubbleBoxLine} />
                    </div>
                    {r.right && <SkeletonAvatar url={avatarUrl} />}
                </div>
            ))}
        </div>
    );
}

// ── Full Chat Room Skeleton (complete layout) ─────────────────────────────
function FullChatSkeleton({ profile }) {
    const avatarUrl = profile?.avatar_url || null;
    const bubbleRows = [
        { w: '55%', right: false },
        { w: '70%', right: true },
        { w: '40%', right: false },
        { w: '60%', right: true },
        { w: '45%', right: false },
    ];
    return (
        <div className={styles.fullSkeleton}>
            {/* Header skeleton */}
            <div className={styles.fullSkeletonHeader}>
                <div className={styles.skelPulse} style={{ width: 36, height: 36, borderRadius: 8 }} />
                <div style={{ flex: 1, marginLeft: 12 }}>
                    <div className={styles.skelPulse} style={{ width: '40%', height: 14, borderRadius: 4, marginBottom: 6 }} />
                    <div className={styles.skelPulse} style={{ width: '25%', height: 10, borderRadius: 4 }} />
                </div>
                <div className={styles.skelPulse} style={{ width: 36, height: 36, borderRadius: 8 }} />
            </div>

            <div className={styles.fullSkeletonBody}>
                {/* Side menu skeleton */}
                <div className={styles.fullSkeletonSide}>
                    <div className={styles.fullSkeletonSideHeader}>
                        <div className={styles.skelPulse} style={{ width: 60, height: 14, borderRadius: 4 }} />
                        <div className={styles.skelPulse} style={{ width: 24, height: 24, borderRadius: 6 }} />
                    </div>
                    {/* Tab skeletons */}
                    <div className={styles.fullSkeletonTabs}>
                        <div className={styles.skelPulse} style={{ flex: 1, height: 32, borderRadius: 6 }} />
                        <div className={styles.skelPulse} style={{ flex: 1, height: 32, borderRadius: 6 }} />
                    </div>
                    {/* Room list skeletons */}
                    <div className={styles.fullSkeletonRoomList}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={styles.fullSkeletonRoomItem}>
                                <div className={styles.skelPulse} style={{ width: 32, height: 32, borderRadius: 8 }} />
                                <div style={{ flex: 1 }}>
                                    <div className={styles.skelPulse} style={{ width: `${55 + (i % 3) * 12}%`, height: 12, borderRadius: 4, marginBottom: 6 }} />
                                    <div className={styles.skelPulse} style={{ width: `${35 + (i % 2) * 15}%`, height: 9, borderRadius: 4 }} />
                                </div>
                                <div className={styles.skelPulse} style={{ width: 8, height: 8, borderRadius: '50%' }} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat area skeleton, fills remaining height */}
                <div className={styles.fullSkeletonChat}>
                    <div className={styles.fullSkeletonMessages}>
                        {bubbleRows.map((r, i) => (
                            <div key={i} className={`${styles.skeletonBubble} ${r.right ? styles.skeletonBubbleRight : ''}`}>
                                {!r.right && <SkeletonAvatar url={avatarUrl} />}
                                <div className={styles.skeletonBubbleBox} style={{ width: r.w }}>
                                    <div className={styles.skeletonBubbleBoxLine} />
                                    <div className={styles.skeletonBubbleBoxLine} />
                                </div>
                                {r.right && <SkeletonAvatar url={avatarUrl} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Room List Skeleton Loader ─────────────────────────────────────────────
function RoomListSkeleton() {
    return (
        <div className={styles.roomListSkeleton}>
            {[...Array(4)].map((_, i) => (
                <div key={i} className={styles.roomListSkeletonItem}>
                    <div className={styles.roomListSkeletonIcon} />
                    <div className={styles.roomListSkeletonText}>
                        <div className={styles.roomListSkeletonLine} style={{ width: `${60 + (i % 3) * 15}%` }} />
                        <div className={styles.roomListSkeletonLineSmall} style={{ width: `${40 + (i % 2) * 20}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Room Info Panel ───────────────────────────────────────────────────────
function RoomInfoPanel({ stats, infoOpen, onClose }) {
    if (!stats) return null;

    const checkLabels = {
        // Freelancer-side confirm flags
        freelancer_guide_sent: 'Freelancer Guide Sent',
        freelancer_rules_sent: 'Freelancer Rules Sent',
        freelancer_job_details_sent: 'Freelancer Job Details Sent',
        // Client-side confirm flags
        client_guide_sent: 'Client Guide Sent',
        client_rules_sent: 'Client Rules Sent',
        client_job_details_sent: 'Client Job Details Sent',
        // Progress flags
        final_budget_selected: 'Budget Set',
        milestones_selected: 'Milestones Set',
        client_proposal_review: 'Client Proposal Review',
        freelancer_proposal_review: 'Freelancer Proposal Review',
        client_accepted_proposal: 'Client Accepted',
        freelancer_accepted_proposal: 'Freelancer Accepted',
        freelancer_transcript_sent: 'Freelancer Transcript Sent',
        client_transcript_sent: 'Client Transcript Sent',
    };

    return (
        <div className={`${styles.infoPanel} ${infoOpen ? styles.infoPanelOpen : ''}`}>
            <div className={styles.infoPanelHeader}>
                <h3 className={styles.infoPanelTitle}>Room Details</h3>
                <button className={styles.infoBtn} onClick={onClose}>
                    <X size={16} />
                </button>
            </div>
            <div className={styles.infoPanelBody}>
                {/* Basic Info */}
                <div className={styles.infoSection}>
                    <p className={styles.infoSectionTitle}>General</p>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Job Title</span>
                        <span className={styles.infoValue}>{stats.job_title}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Room ID</span>
                        <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                            {stats.room_id}
                        </span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Status</span>
                        <span className={styles.infoValue} style={{
                            color: stats.status === 'open' ? '#1A7A4A' : '#8A95A5',
                        }}>
                            {stats.status === 'open' ? '● Open' : '● Closed'}
                        </span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Created</span>
                        <span className={styles.infoValue}>{formatDate(stats.created_at)}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Last Active</span>
                        <span className={styles.infoValue}>{formatRelativeTime(stats.last_activity)}</span>
                    </div>
                </div>

                {/* Participants */}
                <div className={styles.infoSection}>
                    <p className={styles.infoSectionTitle}>Participants</p>
                    <div className={styles.infoParticipant}>
                        <div className={styles.infoParticipantAvatar}>
                            <Avatar url={stats.client_avatar_url} name={stats.client_name} sender="client" size={32} />
                        </div>
                        <div>
                            <div className={styles.infoParticipantName}>{stats.client_name}</div>
                            <div className={styles.infoParticipantRole}>Client</div>
                        </div>
                    </div>
                    <div className={styles.infoParticipant}>
                        <div className={styles.infoParticipantAvatar}>
                            <Avatar url={stats.freelancer_avatar_url} name={stats.freelancer_name} sender="freelancer" size={32} />
                        </div>
                        <div>
                            <div className={styles.infoParticipantName}>{stats.freelancer_name}</div>
                            <div className={styles.infoParticipantRole}>Freelancer</div>
                        </div>
                    </div>
                </div>

                {/* Checks */}
                <div className={styles.infoSection}>
                    <p className={styles.infoSectionTitle}>Room Progress</p>
                    <div className={styles.checkGrid}>
                        {Object.entries(checkLabels).map(([key, label]) => {
                            const done = stats.checks?.[key];
                            return (
                                <div key={key} className={styles.checkItem}>
                                    <div className={`${styles.checkIcon} ${done ? styles.checkIconDone : styles.checkIconPending}`}>
                                        {done ? '✓' : '○'}
                                    </div>
                                    <span>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Milestones */}
                {stats.milestones_summary && stats.milestones_summary.total > 0 && (
                    <div className={styles.infoSection}>
                        <p className={styles.infoSectionTitle}>Milestones</p>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Total</span>
                            <span className={styles.infoValue}>{stats.milestones_summary.total}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Completed</span>
                            <span className={styles.infoValue}>{stats.milestones_summary.completed}</span>
                        </div>
                    </div>
                )}

                {/* Stats */}
                {stats.stats && (
                    <div className={styles.infoSection}>
                        <p className={styles.infoSectionTitle}>Statistics</p>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Messages</span>
                            <span className={styles.infoValue}>{stats.stats.message_count}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Complaints</span>
                            <span className={styles.infoValue}>{stats.stats.complaint_count}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Closures</span>
                            <span className={styles.infoValue}>{stats.stats.closure_count}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main ChatRoom Component
   ═══════════════════════════════════════════════════════════════════════════ */
const ChatRoom = ({ profile, currentRole }) => {
    const isPremium = profile?.premium_tier === 'premium';

    // ── State ────────────────────────────────────────────────────────────
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('interview');
    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    // Meta from transcript-index (names, avatars, viewer_role, ...)
    const [transcript, setTranscript] = useState(null);
    // Filtered transcript entries (show_to-aware, saved order)
    const [transcriptEntries, setTranscriptEntries] = useState([]);
    // Full merged message objects, loaded lazily in chunks (oldest → newest)
    const [messages, setMessages] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [roomStats, setRoomStats] = useState(null);
    const [infoOpen, setInfoOpen] = useState(false);
    const [showNewMsg, setShowNewMsg] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const lastFetchRef = useRef({});  // cache: { roomId: timestamp }

    const chatBodyRef = useRef(null);
    const bottomRef = useRef(null);

    // Lazy-loading refs (avoid stale closures inside callbacks)
    const transcriptRef = useRef(null);
    const transcriptEntriesRef = useRef([]);
    const loadedEntriesRef = useRef([]);   // loaded transcript entries, oldest → newest
    const idByRef = useRef({});            // id -> { type, record } for reply resolution
    const loadedCountRef = useRef(0);      // how many entries are loaded (from the end)
    const preserveScrollRef = useRef(0);   // scrollHeight to restore after prepending
    const shouldAutoScrollRef = useRef(false);
    const loadingOlderRef = useRef(false);

    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { transcriptEntriesRef.current = transcriptEntries; }, [transcriptEntries]);

    // ── Fetch rooms ──────────────────────────────────────────────────────
    const fetchRooms = useCallback(async () => {
        setRoomsLoading(true);
        try {
            const data = await roomService.getMyRooms(currentRole, 'all', activeTab);
            setRooms(data.results || []);
        } catch {
            setRooms([]);
        } finally {
            setRoomsLoading(false);
        }
    }, [currentRole, activeTab]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // ── Rebuild the merged message list from loaded entries + records ────
    const rebuildMessages = useCallback(() => {
        const t = transcriptRef.current || {};
        const out = [];
        for (const e of loadedEntriesRef.current) {
            if (!e || !e.id) continue;
            const hit = idByRef.current[e.id];
            if (!hit) continue;
            const rec = hit.record;
            const isMsg = hit.type === 'message';
            const sender = rec.sender || 'system';

            const msgObj = {
                type: isMsg ? 'msg' : 'complain',
                sender,
                data: isMsg ? (rec.msg_data ?? '') : (rec.complaint_data ?? ''),
                timestamp: e.timestamp || '',
                is_command: isMsg ? Boolean(rec.is_room_command) : false,
                command_name: isMsg ? (rec.command_name || '') : '',
                attachment_metadata: isMsg ? (rec.attachment_metadata || '') : '',
                avatar_url: sender === 'client'
                    ? (t.client_avatar_url || '')
                    : sender === 'freelancer'
                        ? (t.freelancer_avatar_url || '')
                        : '',
            };

            // Reply preview: first data line of the target + "..." when the
            // target data continues beyond the first line (PDF parity).
            const targetId = isMsg
                ? (rec.target_msg || '')
                : (rec.target_msg || rec.target_complaint || '');
            if (targetId && idByRef.current[targetId]) {
                const tHit = idByRef.current[targetId];
                const tRec = tHit.record;
                const tdata = tHit.type === 'message'
                    ? (tRec.msg_data ?? '')
                    : (tRec.complaint_data ?? '');
                const tlines = tdata ? String(tdata).split('\n') : [''];
                let preview = tlines[0] || '';
                if (tlines.length > 1) preview += ' ...';
                const tSender = tRec.sender || 'system';
                msgObj.reply_preview = {
                    sender: tSender,
                    data: preview,
                    avatar_url: tSender === 'client'
                        ? (t.client_avatar_url || '')
                        : tSender === 'freelancer'
                            ? (t.freelancer_avatar_url || '')
                            : '',
                };
            }

            out.push(msgObj);
        }
        setMessages(out);
    }, []);

    // ── Fetch full records for a contiguous chunk of entries ────────────
    const fetchRecordsForChunk = useCallback(async (roomId, entries, fromIndex, endIndex) => {
        // ``endIndex`` caps the chunk at the oldest currently-loaded index so
        // that chunks never overlap when the total isn't a multiple of
        // CHUNK_SIZE (e.g. 30 entries → first chunk [5,30), next [0,5)).
        const toIndex = Math.min(endIndex ?? (fromIndex + CHUNK_SIZE), entries.length);
        const chunk = entries.slice(fromIndex, toIndex);
        if (!chunk.length) {
            setHasMore(false);
            return;
        }

        const msgIds = [];
        const complainIds = [];
        for (const e of chunk) {
            if (!e || !e.id) continue;
            if (e.type === 'message') msgIds.push(e.id);
            else if (e.type === 'complain') complainIds.push(e.id);
        }

        let records = [];
        if (msgIds.length || complainIds.length) {
            const res = await roomService.getTranscriptRecords(
                roomId, currentRole, msgIds, complainIds,
            );
            records = (res && res.records) || [];
        }

        for (const r of records) {
            if (!r) continue;
            const rid = r.type === 'message' ? r.msg_id : r.complaint_id;
            if (rid) idByRef.current[rid] = { type: r.type, record: r };
        }

        // Chunks are always loaded oldest-first from the end, so each new
        // chunk is older than what is already loaded → prepend.
        loadedEntriesRef.current = [...chunk, ...loadedEntriesRef.current];
    }, [currentRole]);

    // ── Load one older chunk (on scroll-to-top) ──────────────────────────
    const loadOlder = useCallback(async () => {
        if (!selectedRoomId || loadingOlderRef.current || !hasMore) return;
        const entries = transcriptEntriesRef.current;
        const total = entries.length;
        const fromIndex = Math.max(0, total - loadedCountRef.current - CHUNK_SIZE);
        if (fromIndex >= total) {
            setHasMore(false);
            return;
        }

        loadingOlderRef.current = true;
        setLoadingOlder(true);
        const prevHeight = chatBodyRef.current ? chatBodyRef.current.scrollHeight : 0;
        try {
            const endIndex = total - loadedCountRef.current;
            await fetchRecordsForChunk(selectedRoomId, entries, fromIndex, endIndex);
            loadedCountRef.current = Math.min(total, loadedCountRef.current + CHUNK_SIZE);
            setHasMore(loadedCountRef.current < total);
            if (chatBodyRef.current && prevHeight) {
                preserveScrollRef.current = prevHeight;
            }
            rebuildMessages();
        } catch {
            // keep existing messages on chunk failure
        } finally {
            loadingOlderRef.current = false;
            setLoadingOlder(false);
        }
    }, [selectedRoomId, hasMore, fetchRecordsForChunk, rebuildMessages]);

    // ── Fetch filtered transcript index when room selected ───────────────
    const fetchTranscriptIndex = useCallback(async (roomId, force = false) => {
        if (!roomId) {
            setTranscript(null);
            setTranscriptEntries([]);
            setMessages([]);
            return;
        }

        // Simple cache: skip if fetched < 10 seconds ago (unless forced)
        const now = Date.now();
        const lastFetch = lastFetchRef.current[roomId] || 0;
        if (!force && now - lastFetch < 10000) {
            setTranscriptLoading(false);
            return;
        }

        setTranscriptLoading(true);
        try {
            const data = await roomService.getTranscriptIndex(roomId, currentRole);
            lastFetchRef.current[roomId] = Date.now();
            const entries = (data && data.transcript_entries) || [];

            // Reset lazy-loading state for this room
            loadedEntriesRef.current = [];
            idByRef.current = {};
            loadedCountRef.current = 0;
            preserveScrollRef.current = 0;
            shouldAutoScrollRef.current = true;
            setTranscript(data);
            setTranscriptEntries(entries);
            setMessages([]);
            setHasMore(entries.length > 0);

            // Load the most recent chunk first (chat opens at the bottom)
            if (entries.length) {
                const fromIndex = Math.max(0, entries.length - CHUNK_SIZE);
                await fetchRecordsForChunk(roomId, entries, fromIndex);
                loadedCountRef.current = Math.min(CHUNK_SIZE, entries.length);
                setHasMore(loadedCountRef.current < entries.length);
                rebuildMessages();
            } else {
                setHasMore(false);
            }

            // Also fetch stats
            const statsData = await roomService.getRoomStats(roomId, currentRole);
        setRoomStats(statsData);
    } catch {
        setTranscript(null);
        setTranscriptEntries([]);
        setMessages([]);
        setRoomStats(null);
    } finally {
        setTranscriptLoading(false);
    }
}, [currentRole, fetchRecordsForChunk, rebuildMessages]);

// ── Manual refresh (bypasses cache, no transcriptLoading skeleton) ──
const handleRefresh = useCallback(async () => {
    if (!selectedRoomId || refreshing) return;
    setRefreshing(true);
    try {
        await fetchTranscriptIndex(selectedRoomId, true);
    } catch {
        // keep existing data on refresh failure
    } finally {
        setRefreshing(false);
    }
}, [selectedRoomId, refreshing, fetchTranscriptIndex]);

useEffect(() => {
    fetchTranscriptIndex(selectedRoomId);
}, [selectedRoomId, fetchTranscriptIndex]);

// ── Auto-scroll to bottom on room load / refresh ─────────────────────
useEffect(() => {
    if (messages.length && bottomRef.current && shouldAutoScrollRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        shouldAutoScrollRef.current = false;
    }
}, [messages]);

// ── Restore scroll position after prepending older messages ─────────
useEffect(() => {
    if (preserveScrollRef.current && chatBodyRef.current) {
        const el = chatBodyRef.current;
        const delta = el.scrollHeight - preserveScrollRef.current;
        el.scrollTop = el.scrollTop + delta;
        preserveScrollRef.current = 0;
    }
}, [messages]);

// ── Detect scroll position: lazy-load older + "new messages" btn ─────
const handleScroll = useCallback(() => {
    if (!chatBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowNewMsg(!isNearBottom);
    // Lazy-load older messages when the user scrolls near the top
    if (scrollTop < 80) {
        loadOlder();
    }
}, [loadOlder]);

const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMsg(false);
}, []);

// ── Select room ──────────────────────────────────────────────────────
const handleSelectRoom = useCallback((roomId) => {
    setSelectedRoomId(roomId);
    setMenuOpen(false);
    setInfoOpen(false);
}, []);

// ── Group messages by date ───────────────────────────────────────────
const groupedMessages = useMemo(() => {
    if (!messages.length) return [];
    const groups = [];
    let currentDate = '';

    for (const msg of messages) {
        const date = formatDate(msg.timestamp);
        if (date !== currentDate) {
            currentDate = date;
            groups.push({ type: 'date', label: date, key: `date-${date}` });
        }
        groups.push({ type: 'message', data: msg, key: msg.timestamp + '-' + msg.sender });
    }
    return groups;
}, [messages]);

// ── Selected room info ───────────────────────────────────────────────
const selectedRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    return rooms.find(r => r.room_id === selectedRoomId);
}, [selectedRoomId, rooms]);

const headerTitle = selectedRoom
    ? selectedRoom.job_title
    : 'Chat Rooms';
const headerSubtitle = selectedRoom
    ? `${selectedRoom.client_name} ↔ ${selectedRoom.freelancer_name}`
    : null;

// ════════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════════
return (
    <div className={`${styles.chatContainer} ${isPremium ? styles.chatContainerPremium : ''}`}>
        {isPremium && <GoldDust />}

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className={`${styles.chatHeader} ${isPremium ? styles.chatHeaderPremium : ''}`}>
            <button
                className={styles.toggleBtn}
                onClick={() => { setMenuOpen(!menuOpen); setInfoOpen(false); }}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className={`${styles.headerTitle} ${isPremium ? styles.headerTitlePremium : ''}`}>
                <h3>{headerTitle}</h3>
                {headerSubtitle && <p className={styles.headerSubtitle}>{headerSubtitle}</p>}
            </div>
            {selectedRoomId && (
                <>
                    <button
                        className={styles.infoBtn}
                        onClick={handleRefresh}
                        disabled={refreshing}
                        aria-label="Refresh chat"
                        title="Refresh"
                    >
                        <RefreshCw
                            size={18}
                            className={refreshing ? 'spin' : ''}
                            style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}}
                        />
                    </button>
                    <button
                        className={styles.infoBtn}
                        onClick={() => { setInfoOpen(!infoOpen); setMenuOpen(false); }}
                        aria-label="Room info"
                    >
                        <Info size={18} />
                    </button>
                </>
            )}
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div
            className={styles.chatBody}
            ref={chatBodyRef}
            onScroll={handleScroll}
        >
            {/* Side Menu */}
            <div className={`${styles.sideMenu} ${menuOpen ? styles.sideMenuOpen : ''}`}>
                <div className={styles.sideMenuHeader}>
                    <span className={styles.sideMenuTitle}>Rooms</span>
                    <button className={styles.toggleBtn} onClick={() => setMenuOpen(false)}>
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'interview' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('interview')}
                    >
                        Interview
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'job' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('job')}
                    >
                        Job
                    </button>
                </div>

                {/* Room List */}
                <div className={styles.roomList}>
                    {activeTab === 'job' ? (
                        <div className={styles.yetToImplement}>
                            <MessageCircle size={32} className={styles.yetToImplementIcon} />
                            <p className={styles.yetToImplementTitle}>Job Rooms</p>
                            <p className={styles.yetToImplementText}>
                                Job rooms are not implemented yet.
                                This feature will be available in a future update.
                            </p>
                        </div>
                    ) : roomsLoading ? (
                        <RoomListSkeleton />
                    ) : rooms.length === 0 ? (
                        <div className={styles.emptyRoomList}>
                            <MessageCircle size={28} className={styles.emptyRoomListIcon} />
                            <p className={styles.emptyRoomListTitle}>No rooms found</p>
                            <p className={styles.emptyRoomListText}>
                                You don't have any interview rooms yet.
                                Rooms are created when you apply to jobs via the Discord bot.
                            </p>
                        </div>
                    ) : (
                        rooms.map(room => (
                            <div
                                key={room.room_id}
                                className={`${styles.roomItem} ${selectedRoomId === room.room_id ? styles.roomItemSelected : ''}`}
                                onClick={() => handleSelectRoom(room.room_id)}
                            >
                                <div className={styles.roomItemIcon}>
                                    <MessageCircle size={16} />
                                </div>
                                <div className={styles.roomItemInfo}>
                                    <p className={styles.roomItemTitle}>{room.job_title}</p>
                                    <p className={styles.roomItemMeta}>
                                        {currentRole === 'client'
                                            ? `with ${room.freelancer_name}`
                                            : `with ${room.client_name}`}
                                        {' · '}
                                        {formatRelativeTime(room.last_activity)}
                                    </p>
                                </div>
                                <div className={`${styles.statusDot} ${room.status === 'open' ? styles.statusDotOpen : styles.statusDotClosed
                                    }`} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Chat Content Wrapper (flex child on desktop) ──── */}
            <div className={styles.chatContent}>
                {/* Room Info Panel, always in DOM for slide transition */}
                <RoomInfoPanel
                    stats={roomStats}
                    infoOpen={infoOpen}
                    onClose={() => setInfoOpen(false)}
                />

                {/* Chat Content */}
                {!selectedRoomId ? (
                    <div className={styles.emptyState}>
                        <MessageCircle size={48} className={styles.emptyStateIcon} />
                        <h3 className={styles.emptyStateTitle}>Select a room to view</h3>
                        <p className={styles.emptyStateText}>
                            Click the menu button to browse your active interview rooms.
                        </p>
                    </div>
                ) : (transcriptLoading || refreshing) ? (
                    <RefreshChatSkeleton profile={profile} />
                ) : !transcript || (transcriptEntries || []).length === 0 ? (
                    <div className={styles.emptyState}>
                        <MessageCircle size={48} className={styles.emptyStateIcon} />
                        <h3 className={styles.emptyStateTitle}>No messages yet</h3>
                        <p className={styles.emptyStateText}>
                            This room has no messages yet. Messages will appear here
                            as they are sent via the Discord bot.
                        </p>
                    </div>
                ) : !isPremium ? (
                    <div className={styles.chatFreePlaceholder}>
                        <Lock size={32} className={styles.chatFreePlaceholderIcon} />
                        <h3 className={styles.chatFreePlaceholderTitle}>Premium Feature</h3>
                        <p className={styles.chatFreePlaceholderText}>
                            Chat messaging is exclusive to premium members.
                            Upgrade your plan to access live interview transcripts
                            and room chat.
                        </p>
                    </div>
                ) : (
                    <div className={styles.messagesContainer}>
                        {loadingOlder && (
                            <div className={styles.loadingOlder}>
                                <span className={styles.loadingOlderSpinner} />
                                Loading older messages…
                            </div>
                        )}
                        {groupedMessages.map(item => {
                            if (item.type === 'date') {
                                return <DateDivider key={item.key} label={item.label} isPremium={isPremium} />;
                            }
                            const msg = item.data;
                            if (msg.type === 'closure') {
                                return <ClosureNotice key={item.key} msg={msg} />;
                            }
                            return (
                                <MessageBubble
                                    key={item.key}
                                    msg={msg}
                                    viewerRole={transcript.viewer_role}
                                    isPremium={isPremium}
                                />
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}

                {/* New Messages Button */}
                {showNewMsg && selectedRoomId && (
                    <button className={styles.newMessagesBtn} onClick={scrollToBottom}>
                        <ChevronDown size={14} />
                        New messages
                    </button>
                )}
            </div>
        </div>
    </div>
);
};

export default ChatRoom;
