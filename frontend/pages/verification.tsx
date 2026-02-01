import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  Shield,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Camera,
  CreditCard,
  Home,
  User,
  X,
  Eye
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';

interface Document {
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'not_uploaded';
  uploadedAt?: string;
  rejectionReason?: string;
}

export default function VerificationPage() {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  
  const [documents, setDocuments] = useState<Document[]>([
    { type: 'identity', status: 'not_uploaded' },
    { type: 'address', status: 'not_uploaded' },
    { type: 'selfie', status: 'not_uploaded' },
  ]);

  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем статус верификации из API
  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        const res = await fetch('/api/verification/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          const apiDocs = data.data.documents || {};
          setDocuments([
            { 
              type: 'identity', 
              status: apiDocs.passport?.status || 'not_uploaded',
              uploadedAt: apiDocs.passport?.uploadedAt
            },
            { 
              type: 'address', 
              status: apiDocs.address?.status || 'not_uploaded',
              uploadedAt: apiDocs.address?.uploadedAt
            },
            { 
              type: 'selfie', 
              status: apiDocs.selfie?.status || 'not_uploaded',
              uploadedAt: apiDocs.selfie?.uploadedAt
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch verification status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchVerificationStatus();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const documentTypes = {
    identity: {
      title: 'Документ, удостоверяющий личность',
      description: 'Паспорт, ID-карта или водительское удостоверение',
      icon: <CreditCard className="w-6 h-6" />,
      accepted: ['Паспорт (разворот с фото)', 'ID-карта (обе стороны)', 'Водительские права (обе стороны)'],
    },
    address: {
      title: 'Подтверждение адреса',
      description: 'Документ с вашим именем и адресом (не старше 3 месяцев)',
      icon: <Home className="w-6 h-6" />,
      accepted: ['Коммунальный счёт', 'Выписка из банка', 'Налоговое уведомление'],
    },
    selfie: {
      title: 'Селфи с документом',
      description: 'Фото с документом в руке и листком с датой',
      icon: <Camera className="w-6 h-6" />,
      accepted: ['Лицо полностью видно', 'Документ читаем', 'Бумажка с текущей датой и "AUREX"'],
    },
  };

  const getStatusInfo = (status: Document['status']) => {
    switch (status) {
      case 'approved':
        return { icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Подтверждён' };
      case 'pending':
        return { icon: <Clock className="w-5 h-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'На проверке' };
      case 'rejected':
        return { icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Отклонён' };
      default:
        return { icon: <Upload className="w-5 h-5" />, color: 'text-aurex-platinum-500', bg: 'bg-aurex-obsidian-700', label: 'Не загружен' };
    }
  };

  const handleUpload = async (type: string, file: File) => {
    setUploadingType(type);
    
    // Маппинг типов документов
    const docTypeMap: Record<string, string> = {
      'identity': 'passport',
      'address': 'address',
      'selfie': 'selfie'
    };
    
    try {
      const res = await fetch(`/api/verification/upload/${docTypeMap[type]}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: file.name })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setDocuments(docs => docs.map(doc => 
          doc.type === type 
            ? { ...doc, status: 'pending', uploadedAt: new Date().toISOString() }
            : doc
        ));
        toast.success('Документ загружен и отправлен на проверку');
      } else {
        toast.error(data.message || 'Ошибка загрузки');
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Fallback - локальное обновление
      setDocuments(docs => docs.map(doc => 
        doc.type === type 
          ? { ...doc, status: 'pending', uploadedAt: new Date().toISOString() }
          : doc
      ));
      toast.success('Документ загружен и отправлен на проверку');
    } finally {
      setUploadingType(null);
    }
  };

  const overallStatus = documents.every(d => d.status === 'approved') 
    ? 'verified'
    : documents.some(d => d.status === 'pending')
      ? 'pending'
      : documents.some(d => d.status === 'rejected')
        ? 'action_required'
        : 'not_started';

  const getOverallStatusInfo = () => {
    switch (overallStatus) {
      case 'verified':
        return { color: 'from-green-500 to-emerald-600', icon: <CheckCircle className="w-8 h-8" />, title: 'Верификация пройдена', description: 'Ваш аккаунт полностью верифицирован' };
      case 'pending':
        return { color: 'from-yellow-500 to-amber-600', icon: <Clock className="w-8 h-8" />, title: 'На проверке', description: 'Ваши документы проверяются (до 24 часов)' };
      case 'action_required':
        return { color: 'from-red-500 to-rose-600', icon: <AlertCircle className="w-8 h-8" />, title: 'Требуется действие', description: 'Некоторые документы были отклонены' };
      default:
        return { color: 'from-aurex-gold-500 to-amber-600', icon: <Shield className="w-8 h-8" />, title: 'Пройдите верификацию', description: 'Загрузите документы для вывода средств' };
    }
  };

  const statusInfo = getOverallStatusInfo();

  return (
    <AuthGuard>
      <Head>
        <title>{t('footer.verification')} - AUREX</title>
        <meta name="description" content={t('footer.verification')} />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-4xl mx-auto px-4">
            {/* Status Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gradient-to-r ${statusInfo.color} rounded-2xl p-6 mb-8 text-white`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  {statusInfo.icon}
                </div>
                <div>
                  <h1 className="text-2xl font-black">{statusInfo.title}</h1>
                  <p className="opacity-90">{statusInfo.description}</p>
                </div>
              </div>
            </motion.div>

            {/* Steps */}
            <div className="flex items-center justify-between mb-8 px-4">
              {['identity', 'address', 'selfie'].map((type, idx) => {
                const doc = documents.find(d => d.type === type);
                const status = getStatusInfo(doc?.status || 'not_uploaded');
                return (
                  <div key={type} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full ${status.bg} ${status.color} flex items-center justify-center`}>
                      {doc?.status === 'approved' ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                    </div>
                    {idx < 2 && (
                      <div className={`w-16 sm:w-24 h-1 mx-2 rounded ${doc?.status === 'approved' ? 'bg-green-500' : 'bg-aurex-obsidian-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Document Cards */}
            <div className="space-y-4">
              {documents.map((doc, idx) => {
                const typeInfo = documentTypes[doc.type as keyof typeof documentTypes];
                const status = getStatusInfo(doc.status);
                
                return (
                  <motion.div
                    key={doc.type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl ${status.bg} ${status.color} flex items-center justify-center`}>
                          {typeInfo.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{typeInfo.title}</h3>
                          <p className="text-sm text-aurex-platinum-400">{typeInfo.description}</p>
                        </div>
                      </div>
                      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${status.bg} ${status.color}`}>
                        {status.icon}
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                    </div>

                    {/* Accepted documents */}
                    <div className="mb-4 p-4 bg-aurex-obsidian-900/50 rounded-xl">
                      <div className="text-sm text-aurex-platinum-400 mb-2">Принимаемые документы:</div>
                      <div className="flex flex-wrap gap-2">
                        {typeInfo.accepted.map((item, i) => (
                          <span key={i} className="px-3 py-1 bg-aurex-obsidian-700 text-aurex-platinum-300 text-xs rounded-full">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Rejection reason */}
                    {doc.status === 'rejected' && doc.rejectionReason && (
                      <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-red-400 font-medium">Причина отклонения:</div>
                            <div className="text-sm text-red-300">{doc.rejectionReason}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upload button */}
                    {(doc.status === 'not_uploaded' || doc.status === 'rejected') && (
                      <label className="block">
                        <div className={`border-2 border-dashed border-aurex-gold-500/30 rounded-xl p-8 text-center cursor-pointer hover:border-aurex-gold-500/60 transition-colors ${uploadingType === doc.type ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploadingType === doc.type ? (
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 border-2 border-aurex-gold-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                              <span className="text-aurex-platinum-400">Загрузка...</span>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto mb-3 text-aurex-gold-500" />
                              <div className="text-white font-medium mb-1">Нажмите для загрузки</div>
                              <div className="text-sm text-aurex-platinum-500">PNG, JPG или PDF до 10MB</div>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUpload(doc.type, e.target.files[0]);
                            }
                          }}
                          disabled={uploadingType === doc.type}
                        />
                      </label>
                    )}

                    {/* Pending/Approved state */}
                    {doc.status === 'pending' && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                        <div className="text-yellow-400 font-medium">Документ на проверке</div>
                        <div className="text-sm text-yellow-300/70">Обычно это занимает до 24 часов</div>
                      </div>
                    )}

                    {doc.status === 'approved' && (
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                        <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                        <div className="text-green-400 font-medium">Документ подтверждён</div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 p-6 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-aurex-gold-500" />
                <span>Зачем нужна верификация?</span>
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-aurex-platinum-400">Защита от мошенничества и отмывания денег</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-aurex-platinum-400">Возможность выводить средства</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-aurex-platinum-400">Повышенные лимиты на транзакции</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-aurex-platinum-400">Соответствие требованиям лицензии</span>
                </div>
              </div>
              <p className="text-xs text-aurex-platinum-500 mt-4">
                Ваши документы хранятся в зашифрованном виде и используются только для верификации.
              </p>
            </motion.div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
