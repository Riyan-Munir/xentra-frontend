import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Menu, X, MessageCircle, Info, Lock, ChevronDown,
    User, Bot, AlertTriangle, LogOut, Clock, RefreshCw,
} from 'lucide-react';
import { roomService } from '../../../services/roomService';
import styles from './ChatRoom.module.css';

/* ═══════════════════════════════════════════════════════════════════════════
   ChatRoom — Premium-only live chat room page for Client & Freelancer
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
    const initial = (name || sender || '?')[0].toUpperCase();

    const fallbackClass = sender === 'client'
        ? styles.avatarFallbackClient
        : sender === 'freelancer'
            ? styles.avatarFallbackFreelancer
            : styles.avatarFallbackBot;

    return (
        <div className={styles.avatar} style={{ width: size, height: size }}>
            {url && !imgError ? (
                <img
                    className={styles.avatarImg}
                    src={url}
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
    return (
        <div className={styles.replyPreview}>
            <div className={styles.replyAccent} />
            <p className={styles.replySender}>{(reply.sender || '').capitalize?.() || reply.sender}</p>
            <p className={styles.replyText}>{(reply.data || '').slice(0, 80)}</p>
        </div>
    );
}

// ── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, viewerRole, isPremium }) {
    const isSelf = msg.sender === viewerRole;

    // Determine bubble class
    let bubbleClass = styles.bubbleOther;
    if (isSelf) bubbleClass = styles.bubbleSelf;
    else if (msg.type === 'complain') bubbleClass = styles.bubbleComplain;
    else if (msg.is_command) bubbleClass = styles.bubbleCommand;
    else if (msg.sender === 'bot') bubbleClass = styles.bubbleBot;

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
                    <div className={styles.commandBadge} style={{ background: '#DDB95A', marginBottom: 6 }}>
                        <AlertTriangle size={10} style={{ marginRight: 4 }} />
                        Complaint
                    </div>
                )}
                <ReplyPreview reply={msg.reply_preview} />
                <p className={styles.bubbleText}>{msg.data}</p>
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

// ── Leave Notice ──────────────────────────────────────────────────────────
function LeaveNotice({ msg }) {
    const name = msg.sender === 'client' ? 'Client' : 'Freelancer';
    return (
        <div className={styles.messageRowLeave}>
            <div className={styles.leaveNoticeCard}>
                <p className={styles.leaveNoticeTitle}>
                    <LogOut size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {name} left the room
                </p>
                {msg.data && <p className={styles.leaveNoticeReason}>{msg.data}</p>}
                <p className={styles.leaveNoticeTime}>{formatTime(msg.timestamp)}</p>
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

// ── Chat Skeleton Loader (initial room select) ────────────────────────────
function ChatSkeleton({ profile }) {
    const avatarUrl = profile?.avatar_url || null;
    const rows = [
        { w: '55%', right: false },
        { w: '70%', right: true },
        { w: '40%', right: false },
        { w: '60%', right: true },
        { w: '45%', right: false },
    ];
    return (
        <div className={styles.skeletonContainer}>
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

                {/* Chat area skeleton — fills remaining height */}
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
function RoomInfoPanel({ stats, onClose }) {
    if (!stats) return null;

    const checkLabels = {
        // Freelancer-side confirm flags
        freelancer_greet_sent: 'Freelancer Greet Sent',
        freelancer_rules_sent: 'Freelancer Rules Sent',
        freelancer_job_details_sent: 'Freelancer Job Details Sent',
        // Client-side confirm flags
        client_greet_sent: 'Client Greet Sent',
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
        <div className={`${styles.infoPanel} ${styles.infoPanelOpen}`}>
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
                            <span className={styles.infoLabel}>Leaves</span>
                            <span className={styles.infoValue}>{stats.stats.leave_count}</span>
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
    const [transcript, setTranscript] = useState(null);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [roomStats, setRoomStats] = useState(null);
    const [infoOpen, setInfoOpen] = useState(false);
    const [showNewMsg, setShowNewMsg] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const lastFetchRef = useRef({});  // cache: { roomId: timestamp }

    const chatBodyRef = useRef(null);
    const bottomRef = useRef(null);

    // ── Fetch rooms ──────────────────────────────────────────────────────
    const fetchRooms = useCallback(async () => {
        if (!isPremium) return;
        setRoomsLoading(true);
        try {
            const data = await roomService.getMyRooms(currentRole, 'all', activeTab);
            setRooms(data.results || []);
        } catch {
            setRooms([]);
        } finally {
            setRoomsLoading(false);
        }
    }, [currentRole, activeTab, isPremium]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // ── Fetch transcript when room selected ──────────────────────────────
    const fetchTranscript = useCallback(async (roomId, force = false) => {
        if (!roomId) { setTranscript(null); return; }

        // Simple cache: skip if fetched < 10 seconds ago (unless forced)
        const now = Date.now();
        const lastFetch = lastFetchRef.current[roomId] || 0;
        if (!force && now - lastFetch < 10000) {
            setTranscriptLoading(false);
            return;
        }

        setTranscriptLoading(true);
        try {
            const data = await roomService.getTranscript(roomId, currentRole);
            setTranscript(data);
            lastFetchRef.current[roomId] = Date.now();
            // Also fetch stats
            const statsData = await roomService.getRoomStats(roomId, currentRole);
            setRoomStats(statsData);
        } catch {
            setTranscript(null);
            setRoomStats(null);
        } finally {
            setTranscriptLoading(false);
        }
    }, [currentRole]);

    // ── Manual refresh (bypasses cache, no transcriptLoading skeleton) ──
    const handleRefresh = useCallback(async () => {
        if (!selectedRoomId || refreshing) return;
        setRefreshing(true);
        try {
            const data = await roomService.getTranscript(selectedRoomId, currentRole);
            setTranscript(data);
            lastFetchRef.current[selectedRoomId] = Date.now();
            const statsData = await roomService.getRoomStats(selectedRoomId, currentRole);
            setRoomStats(statsData);
        } catch {
            // keep existing data on refresh failure
        } finally {
            setRefreshing(false);
        }
    }, [selectedRoomId, refreshing, currentRole]);

    useEffect(() => {
        fetchTranscript(selectedRoomId);
    }, [selectedRoomId, fetchTranscript]);

    // ── Auto-scroll to bottom ────────────────────────────────────────────
    useEffect(() => {
        if (transcript?.messages && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcript?.messages]);

    // ── Detect scroll position for "new messages" button ─────────────────
    const handleScroll = useCallback(() => {
        if (!chatBodyRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowNewMsg(!isNearBottom);
    }, []);

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
        if (!transcript?.messages) return [];
        const groups = [];
        let currentDate = '';

        for (const msg of transcript.messages) {
            const date = formatDate(msg.timestamp);
            if (date !== currentDate) {
                currentDate = date;
                groups.push({ type: 'date', label: date, key: `date-${date}` });
            }
            groups.push({ type: 'message', data: msg, key: msg.timestamp + '-' + msg.sender });
        }
        return groups;
    }, [transcript?.messages]);

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
    // RENDER — Locked (free tier)
    // ════════════════════════════════════════════════════════════════════
    if (!isPremium) {
        return (
            <div className={`${styles.chatContainer} ${styles.chatContainerLocked}`}>
                <div className={styles.lockedOverlay}>
                    <div className={styles.lockedIconBlue}>
                        <Lock size={28} />
                    </div>
                    <h3 className={styles.lockedTitle}>Premium Feature</h3>
                    <p className={styles.lockedText}>
                        Chat Rooms is an exclusive feature for premium members.
                        Upgrade your plan to access live interview transcripts,
                        room management, and more.
                    </p>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════
    // RENDER — Premium (unlocked)
    // ════════════════════════════════════════════════════════════════════
    return (
        <div className={`${styles.chatContainer} ${styles.chatContainerPremium}`}>
            <GoldDust />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className={`${styles.chatHeader} ${styles.chatHeaderPremium}`}>
                <button
                    className={styles.toggleBtn}
                    onClick={() => { setMenuOpen(!menuOpen); setInfoOpen(false); }}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                >
                    {menuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                <div className={`${styles.headerTitle} ${styles.headerTitlePremium}`}>
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
                    {/* Room Info Panel */}
                    {infoOpen && (
                        <RoomInfoPanel
                            stats={roomStats}
                            onClose={() => setInfoOpen(false)}
                        />
                    )}

                    {/* Chat Content */}
                    {!selectedRoomId ? (
                        <div className={styles.emptyState}>
                            <MessageCircle size={48} className={styles.emptyStateIcon} />
                            <h3 className={styles.emptyStateTitle}>Select a room to view</h3>
                            <p className={styles.emptyStateText}>
                                Click the menu button to browse your active interview rooms.
                            </p>
                        </div>
                    ) : transcriptLoading ? (
                        <ChatSkeleton profile={profile} />
                    ) : refreshing ? (
                        <RefreshChatSkeleton profile={profile} />
                    ) : !transcript || transcript.messages?.length === 0 ? (
                        <div className={styles.emptyState}>
                            <MessageCircle size={48} className={styles.emptyStateIcon} />
                            <h3 className={styles.emptyStateTitle}>No messages yet</h3>
                            <p className={styles.emptyStateText}>
                                This room has no messages yet. Messages will appear here
                                as they are sent via the Discord bot.
                            </p>
                        </div>
                    ) : (
                        <div className={styles.messagesContainer}>
                            {groupedMessages.map(item => {
                                if (item.type === 'date') {
                                    return <DateDivider key={item.key} label={item.label} isPremium={isPremium} />;
                                }
                                const msg = item.data;
                                if (msg.type === 'leave') {
                                    return <LeaveNotice key={item.key} msg={msg} />;
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
