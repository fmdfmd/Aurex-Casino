import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  User,
  Download,
  RefreshCw,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface KYCRequest {
  id: string;
  odid: string;
  username: string;
  email: string;
  documentType: 'identity' | 'address' | 'selfie';
  documentName: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export default function AdminVerificationPage() {
  const { token } = useAuthStore();
  const [requests, setRequests] = useState<KYCRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const res = await fetch('/api/verification', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Преобразуем данные из API в формат KYCRequest
        const formatted = data.data.flatMap((v: any) => 
          Object.entries(v.documents || {}).map(([type, doc]: [string, any]) => ({
            id: `${v.id}-${type}`,
            odid: v.odid,
            username: v.username,
            email: v.email,
            documentType: type,
            documentName: doc.url?.split('/').pop() || `${type}.jpg`,
            fileUrl: doc.url,
            status: doc.status === 'not_uploaded' ? 'pending' : doc.status,
            submittedAt: v.submittedAt,
            reviewedAt: v.approvedAt || v.rejectedAt,
          }))
        );
        setRequests(formatted);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Failed to fetch verification requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<KYCRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const getStatusBadge = (status: KYCRequest['status']) => {
    const styles = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Clock className="w-4 h-4" />, label: 'Ожидает' },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle className="w-4 h-4" />, label: 'Подтверждён' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle className="w-4 h-4" />, label: 'Отклонён' },
    };
    const s = styles[status];
    return (
      <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        {s.icon}
        <span>{s.label}</span>
      </span>
    );
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      identity: 'Удостоверение личности',
      address: 'Подтверждение адреса',
      selfie: 'Селфи с документом',
    };
    return labels[type] || type;
  };

  const filteredRequests = (requests || []).filter(r => {
    const matchesSearch = 
      r.odid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesType = typeFilter === 'all' || r.documentType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => 
      r.id === id 
        ? { ...r, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewedBy: 'Admin' }
        : r
    ));
    setSelectedRequest(null);
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    setRequests(prev => prev.map(r => 
      r.id === selectedRequest.id 
        ? { ...r, status: 'rejected' as const, reviewedAt: new Date().toISOString(), reviewedBy: 'Admin', rejectionReason }
        : r
    ));
    setSelectedRequest(null);
    setShowRejectModal(false);
    setRejectionReason('');
  };

  const stats = {
    pending: (requests || []).filter(r => r.status === 'pending').length,
    approved: (requests || []).filter(r => r.status === 'approved').length,
    rejected: (requests || []).filter(r => r.status === 'rejected').length,
    total: (requests || []).length,
  };

  return (
    <AuthGuard >
      <Head>
        <title>KYC Верификация - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">KYC Верификация</h1>
              <p className="text-aurex-platinum-400">Проверка документов пользователей</p>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-700 rounded-lg text-aurex-platinum-300 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Обновить</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-sm text-yellow-300">Ожидают проверки</div>
            </div>
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
              <div className="text-sm text-green-300">Подтверждено</div>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
              <div className="text-sm text-red-300">Отклонено</div>
            </div>
            <div className="p-4 bg-aurex-gold-500/10 border border-aurex-gold-500/30 rounded-xl">
              <div className="text-2xl font-bold text-aurex-gold-500">{stats.total}</div>
              <div className="text-sm text-aurex-gold-400">Всего заявок</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aurex-platinum-500" />
              <input
                type="text"
                placeholder="Поиск по ID, имени, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-lg text-white focus:outline-none"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают</option>
              <option value="approved">Подтверждённые</option>
              <option value="rejected">Отклонённые</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-lg text-white focus:outline-none"
            >
              <option value="all">Все типы</option>
              <option value="identity">Удостоверение личности</option>
              <option value="address">Подтверждение адреса</option>
              <option value="selfie">Селфи</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-aurex-gold-500/20">
                    <th className="text-left p-4 text-aurex-platinum-500 text-sm font-medium">ID</th>
                    <th className="text-left p-4 text-aurex-platinum-500 text-sm font-medium">Пользователь</th>
                    <th className="text-left p-4 text-aurex-platinum-500 text-sm font-medium">Тип документа</th>
                    <th className="text-left p-4 text-aurex-platinum-500 text-sm font-medium">Файл</th>
                    <th className="text-left p-4 text-aurex-platinum-500 text-sm font-medium">Статус</th>
                    <th className="text-left p-4 text-aurex-platinum-500 text-sm font-medium">Дата</th>
                    <th className="text-right p-4 text-aurex-platinum-500 text-sm font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aurex-gold-500/10">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-aurex-platinum-600" />
                        <p className="text-aurex-platinum-400">Заявки не найдены</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-aurex-obsidian-700/50 transition-colors">
                        <td className="p-4">
                          <span className="text-aurex-gold-500 font-mono text-sm">{request.id}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">{request.username}</div>
                          <div className="text-xs text-aurex-platinum-500">{request.odid}</div>
                        </td>
                        <td className="p-4 text-aurex-platinum-300 text-sm">
                          {getDocTypeLabel(request.documentType)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-aurex-platinum-500" />
                            <span className="text-aurex-platinum-300 text-sm">{request.documentName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="p-4 text-aurex-platinum-400 text-sm">
                          {request.submittedAt}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setSelectedRequest(request)}
                              className="p-2 bg-aurex-obsidian-700 rounded-lg text-aurex-platinum-300 hover:text-white transition-colors"
                              title="Просмотреть"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(request.id)}
                                  className="p-2 bg-green-500/20 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
                                  title="Подтвердить"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setSelectedRequest(request); setShowRejectModal(true); }}
                                  className="p-2 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
                                  title="Отклонить"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* View Modal */}
          {selectedRequest && !showRejectModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRequest(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-aurex-gold-500/20">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Просмотр документа</h2>
                    <button onClick={() => setSelectedRequest(null)} className="text-aurex-platinum-500 hover:text-white">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-aurex-platinum-500 mb-1">Пользователь</div>
                      <div className="text-white font-medium">{selectedRequest.username}</div>
                      <div className="text-xs text-aurex-platinum-500">{selectedRequest.odid}</div>
                    </div>
                    <div>
                      <div className="text-sm text-aurex-platinum-500 mb-1">Тип документа</div>
                      <div className="text-white">{getDocTypeLabel(selectedRequest.documentType)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-aurex-platinum-500 mb-1">Статус</div>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                    <div>
                      <div className="text-sm text-aurex-platinum-500 mb-1">Дата отправки</div>
                      <div className="text-white">{selectedRequest.submittedAt}</div>
                    </div>
                  </div>

                  {/* Document Preview */}
                  <div className="bg-aurex-obsidian-900 rounded-xl p-8 text-center mb-6">
                    {selectedRequest.fileUrl ? (
                      <img 
                        src={`/api${selectedRequest.fileUrl}`}
                        alt={selectedRequest.documentName}
                        className="max-w-full max-h-64 mx-auto mb-4 rounded-lg object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={selectedRequest.fileUrl ? 'hidden' : ''}>
                      <FileText className="w-16 h-16 mx-auto mb-4 text-aurex-platinum-600" />
                    </div>
                    <div className="text-white font-medium mb-2">{selectedRequest.documentName}</div>
                    <button 
                      onClick={async () => {
                        if (selectedRequest.fileUrl) {
                          try {
                            const response = await fetch(`/api${selectedRequest.fileUrl}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = selectedRequest.documentName || 'document';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } else {
                              toast.error('Не удалось скачать файл');
                            }
                          } catch (error) {
                            console.error('Download error:', error);
                            toast.error('Ошибка скачивания');
                          }
                        } else {
                          toast.error('Файл документа недоступен');
                        }
                      }}
                      className="flex items-center space-x-2 mx-auto px-4 py-2 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-lg hover:bg-aurex-gold-400 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Скачать</span>
                    </button>
                  </div>

                  {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-red-400 font-medium">Причина отклонения:</div>
                          <div className="text-sm text-red-300">{selectedRequest.rejectionReason}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedRequest.status === 'pending' && (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleApprove(selectedRequest.id)}
                        className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span>Подтвердить</span>
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2"
                      >
                        <XCircle className="w-5 h-5" />
                        <span>Отклонить</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Reject Modal */}
          {showRejectModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-aurex-gold-500/20">
                  <h2 className="text-xl font-bold text-white">Отклонить документ</h2>
                </div>
                <div className="p-6">
                  <p className="text-aurex-platinum-400 mb-4">
                    Укажите причину отклонения документа для пользователя {selectedRequest.username}
                  </p>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Причина отклонения..."
                    rows={4}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none resize-none mb-4"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                      className="flex-1 py-3 bg-aurex-obsidian-700 text-aurex-platinum-300 font-bold rounded-xl"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={!rejectionReason.trim()}
                      className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl disabled:opacity-50"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
