import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Copy, 
  CheckCircle2, 
  ExternalLink,
  Users,
  AlertTriangle,
  Check,
  Building2,
  Plus,
  Ban,
  Info,
  X,
  ShieldCheck,
  Link as LinkIcon,
  LogOut,
  FileSpreadsheet,
  Archive,
  Camera,
  Calendar,
  Loader2,
  FileCheck,
  Clock,
  GraduationCap,
  Printer,
  Eye,
  Ear,
  Smile,
  Brain,
  Apple,
  HeartPulse,
  Cake,
  UserCheck,
  Mail,
  Send,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import JSZip from 'jszip';
import { GeradorPdfTermoSesi } from '../../lib/pades/GeradorPdfTermoSesi.ts';
import { apiClient } from '../../lib/api.ts';
import type { Institution } from '../../lib/types.ts';

interface AdminDashboardProps {
  onNavigateToSignerToken: (token: string, schoolSlug?: string) => void;
  onNavigateToValidatorHash: (hash: string) => void;
  currentUser?: any;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToSignerToken,
  onNavigateToValidatorHash,
  currentUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'authorizations' | 'schools'>('authorizations');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [selectedImageOption, setSelectedImageOption] = useState<'all' | 'authorized' | 'not_authorized'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'signed' | 'pending' | 'revoked' | 'CANCELADO_POR_ERRO'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [selectedTurn, setSelectedTurn] = useState<string>('all');
  const [subTab, setSubTab] = useState<'active' | 'cancelled' | 'all'>('active');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showNewSchoolModal, setShowNewSchoolModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const handleStatusFilterChange = (status: 'all' | 'signed' | 'pending' | 'revoked' | 'CANCELADO_POR_ERRO') => {
    setSelectedStatus(status);
    setCurrentPage(1);
    if (status === 'signed' || status === 'pending') {
      setSubTab('active');
    } else if (status === 'revoked' || status === 'CANCELADO_POR_ERRO') {
      setSubTab('cancelled');
    }
  };

  const handleSubTabChange = (tab: 'active' | 'cancelled' | 'all') => {
    setSubTab(tab);
    setCurrentPage(1);
    if (tab === 'active' && (selectedStatus === 'revoked' || selectedStatus === 'CANCELADO_POR_ERRO')) {
      setSelectedStatus('all');
    } else if (tab === 'cancelled' && (selectedStatus === 'signed' || selectedStatus === 'pending')) {
      setSelectedStatus('all');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedInstitution('all');
    setSelectedImageOption('all');
    setSelectedStatus('all');
    setSelectedDateRange('all');
    setSelectedSeries('all');
    setSelectedTurn('all');
    setSubTab('all');
    setCurrentPage(1);
  };

  const isFiltered = searchTerm !== '' || selectedInstitution !== 'all' || selectedImageOption !== 'all' || selectedStatus !== 'all' || selectedDateRange !== 'all' || selectedSeries !== 'all' || selectedTurn !== 'all' || subTab !== 'all';

  // Estados do Modal de Ficha Completa do Aluno (Triagem SESI Saúde)
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAuthForDetails, setSelectedAuthForDetails] = useState<any | null>(null);

  // Estados do Modal de Revogação / Cancelamento por Erro
  const [showRevocationModal, setShowRevocationModal] = useState(false);
  const [selectedAuthToRevoke, setSelectedAuthToRevoke] = useState<any | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [revocationConfirmed, setRevocationConfirmed] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revocationError, setRevocationError] = useState('');
  const [revocationSuccessToast, setRevocationSuccessToast] = useState<string | null>(null);

  // Estados do Modal de Reenvio de E-mail
  const [showResendEmailModal, setShowResendEmailModal] = useState(false);
  const [selectedAuthForResendEmail, setSelectedAuthForResendEmail] = useState<any | null>(null);
  const [resendEmailInput, setResendEmailInput] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendEmailFeedback, setResendEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Formulário de nova escola
  const [newSchoolData, setNewSchoolData] = useState({
    id: '',
    name: '',
    short_name: '',
    city: 'Taguatinga',
    state: 'DF',
  });
  const [schoolFormError, setSchoolFormError] = useState('');

  const fetchInstitutions = async () => {
    const res = await apiClient.getAdminInstitutions();
    if (res.success && res.institutions) {
      const legacyIds = ['ced01-estrutural', 'cem02-ceilandia', 'ced02-guara'];
      const activeOnly = res.institutions.filter(
        (i: any) => !legacyIds.includes(i.id) && i.is_active !== false && i.is_active !== 0
      );
      setInstitutions(activeOnly);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const resDocs = await apiClient.getAdminDocuments('all');
      const resLogs = await apiClient.getAdminAuditLogs();
      const resInst = await apiClient.getAdminInstitutions();
      
      const instList = resInst.success && resInst.institutions ? resInst.institutions : [];

      if (resDocs.success && Array.isArray(resDocs.documents)) {
        const auths = resDocs.documents.map((doc: any) => {
          const log = resLogs?.success && resLogs.logs ? resLogs.logs.find((l: any) => l.document_id === doc.id) : null;
          const instMatch = instList.find((i: any) => 
            i.id === doc.institution_id || 
            (doc.access_token && doc.access_token.toLowerCase().includes(i.id))
          );

          const isSigned = doc.status === 'signed';
          const authImageGranted = doc.auth_image !== 'no' && doc.auth_image !== false;

          const realParentName = (log?.signer_name && log.signer_name.trim().toLowerCase() !== 'responsável legal')
            ? log.signer_name
            : (doc.parent_name && doc.parent_name.trim().toLowerCase() !== 'responsável legal'
                ? doc.parent_name
                : (log?.signer_name || doc.parent_name || (isSigned ? 'Responsável Legal' : 'Aguardando preenchimento')));

          const realStudentName = (doc.minor_name && doc.minor_name.trim().toLowerCase() !== 'estudante escola cidadã' && doc.minor_name.trim().toLowerCase() !== 'estudante')
            ? doc.minor_name
            : (doc.minor_name || (isSigned ? 'Estudante Cadastrado' : 'Aguardando preenchimento'));

          const studentCpfMasked = doc.minor_cpf || (isSigned ? 'CPF não informado' : 'Pendente');

          return {
            id: doc.id,
            accessToken: doc.access_token,
            studentName: realStudentName,
            studentCpfMasked,
            birthDate: doc.minor_birth_date || '',
            parentName: realParentName,
            parentCpfMasked: log?.signer_cpf_masked || (isSigned ? '***.***.***-**' : 'Pendente'),
            parentEmail: doc.parent_email || '',
            relationship: log?.signer_relationship || (isSigned ? 'Responsável' : 'Aguardando'),
            activity: doc.template_title || 'Escola Cidadã — Saúde em Movimento',
            institutionId: instMatch ? instMatch.id : (doc.institution_id || 'cemeit'),
            institutionName: instMatch ? instMatch.short_name : (doc.institution_name || 'CEMEIT'),
            status: doc.status || 'pending',
            authHealth: true,
            authData: true,
            authImage: authImageGranted,
            optInOftalmo: isSigned,
            optInAudio: isSigned,
            optInOdonto: isSigned,
            optInPsico: isSigned,
            optInNutri: isSigned,
            minorSeries: doc.minor_series || '',
            minorClass: doc.minor_class || '',
            minorTurn: doc.minor_turn || '',
            dateSent: doc.created_at ? new Date(doc.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Hoje',
            signedAtDate: doc.created_at ? new Date(doc.created_at) : new Date(),
            hash: log?.manifest_sha256 || doc.content_sha256,
            validationCode: log?.manifest_sha256
              ? `SESI-${log.manifest_sha256.substring(0, 4).toUpperCase()}-${log.manifest_sha256.substring(log.manifest_sha256.length - 4).toUpperCase()}`
              : (doc.id ? `SESI-${doc.id.substring(0, 4).toUpperCase()}` : 'SESI-VALID'),
          };
        });
        setAuthorizations(auths);
      }
    };
    fetchData();
    fetchInstitutions();
  }, []);

  const handleCopySchoolLink = (slug: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/autorizar/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolFormError('');
    if (!newSchoolData.name.trim() || !newSchoolData.short_name.trim()) {
      setSchoolFormError('Nome completo e sigla da escola são obrigatórios.');
      return;
    }

    const generatedSlug = (newSchoolData.id || newSchoolData.short_name)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '-');

    const res = await apiClient.createAdminInstitution({
      id: generatedSlug,
      name: newSchoolData.name.trim(),
      short_name: newSchoolData.short_name.trim(),
      city: newSchoolData.city.trim() || 'Taguatinga',
      state: newSchoolData.state.trim().toUpperCase() || 'DF',
    });

    if (res.success) {
      setShowNewSchoolModal(false);
      setNewSchoolData({ id: '', name: '', short_name: '', city: 'Taguatinga', state: 'DF' });
      fetchInstitutions();
    } else {
      setSchoolFormError(res.error || 'Erro ao cadastrar escola.');
    }
  };

  const handleDeactivateSchool = async (id: string) => {
    if (confirm('Deseja desativar esta instituição do catálogo de rotas ativas?')) {
      await apiClient.deleteAdminInstitution(id);
      fetchInstitutions();
    }
  };

  const handleOpenDetailsModal = (auth: any) => {
    setSelectedAuthForDetails(auth);
    setShowDetailsModal(true);
  };

  const handlePrintStudentCard = () => {
    window.print();
  };

  const formatStudentSeriesClass = (series?: string, minorClass?: string) => {
    let s = (series || '').trim();
    if (/^\d+$/.test(s)) s = `${s}º Ano`;
    else if (/^\d+º$/.test(s)) s = `${s} Ano`;

    let c = (minorClass || '').trim();
    if (c.toLowerCase().startsWith('turma ')) {
      c = c.substring(6).trim();
    }

    if (s && c) return `${s} • Turma ${c}`;
    if (s) return s;
    if (c) return `Turma ${c}`;
    return '';
  };

  const formatBirthDateAndAge = (birthDateStr?: string) => {
    if (!birthDateStr) return null;
    const str = birthDateStr.trim();
    let dateObj: Date | null = null;
    
    if (str.includes('/')) {
      const [d, m, y] = str.split('/');
      if (d && m && y) {
        dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      }
    } else if (str.includes('-')) {
      const [y, m, d] = str.split('-');
      if (y && m && d) {
        dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      }
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      return { formattedDate: str, age: null, isAdult: false };
    }

    const formattedDate = dateObj.toLocaleDateString('pt-BR');
    const now = new Date();
    let age = now.getFullYear() - dateObj.getFullYear();
    const m = now.getMonth() - dateObj.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dateObj.getDate())) {
      age--;
    }

    return {
      formattedDate,
      age: age >= 0 && age <= 120 ? `${age} anos` : null,
      isAdult: age >= 18,
    };
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarGradient = (name?: string) => {
    const gradients = [
      'from-blue-600 to-indigo-700',
      'from-sky-600 to-blue-800',
      'from-emerald-600 to-teal-800',
      'from-violet-600 to-purple-800',
      'from-amber-600 to-orange-700',
      'from-teal-600 to-cyan-800',
    ];
    if (!name) return gradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  };

  const formatStatusInPortuguese = (status?: string) => {
    if (!status) return 'Pendente';
    switch (status.toLowerCase()) {
      case 'signed':
        return 'Autorizada (Assinada)';
      case 'pending':
        return 'Pendente';
      case 'revoked':
        return 'Negada (Revogada)';
      case 'cancelado_por_erro':
      case 'cancelled_error':
        return 'Cancelada por Erro';
      case 'draft':
        return 'Rascunho';
      case 'expired':
        return 'Expirada';
      default:
        return status;
    }
  };

  const handleOpenRevokeModal = (auth: any) => {
    setSelectedAuthToRevoke(auth);
    setRevocationReason('');
    setRevocationConfirmed(false);
    setRevocationError('');
    setShowRevocationModal(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedAuthToRevoke) return;
    if (revocationReason.trim().length < 10) {
      setRevocationError('A justificativa deve conter no mínimo 10 caracteres detalhando a inconsistência.');
      return;
    }
    if (!revocationConfirmed) {
      setRevocationError('É obrigatório confirmar a declaração de ciência e consentimento.');
      return;
    }

    setIsRevoking(true);
    setRevocationError('');

    try {
      const res = await apiClient.cancelDocumentDueToError(
        selectedAuthToRevoke.id,
        revocationReason.trim()
      );
      setIsRevoking(false);

      if (res && res.success) {
        setAuthorizations((prev) =>
          prev.map((a) =>
            a.id === selectedAuthToRevoke.id
              ? {
                  ...a,
                  status: 'CANCELADO_POR_ERRO',
                  cancellationReason: revocationReason.trim(),
                }
              : a
          )
        );
        setShowRevocationModal(false);
        const emailMsg = res.target_email 
          ? ` O e-mail de notificação foi enviado para ${res.target_email}.`
          : ' Notificação registrada na trilha forense.';
        setRevocationSuccessToast(
          `Autorização ${selectedAuthToRevoke.validationCode || selectedAuthToRevoke.id} cancelada por inconsistência operacional.${emailMsg}`
        );
        setTimeout(() => setRevocationSuccessToast(null), 8000);
      } else {
        setRevocationError(res?.error || 'Falha ao processar a anulação por erro. Verifique as permissões.');
      }
    } catch (err: any) {
      setIsRevoking(false);
      setRevocationError(err?.message || 'Erro inesperado de comunicação com o servidor.');
    }
  };

  const handleOpenResendEmailModal = (auth: any) => {
    setSelectedAuthForResendEmail(auth);
    setResendEmailInput(auth.parentEmail || '');
    setResendEmailFeedback(null);
    setShowResendEmailModal(true);
  };

  const handleConfirmResendEmail = async () => {
    if (!selectedAuthForResendEmail || !resendEmailInput.trim() || !resendEmailInput.includes('@')) {
      setResendEmailFeedback({ success: false, message: 'Por favor, informe um endereço de e-mail válido com @.' });
      return;
    }
    setIsResendingEmail(true);
    setResendEmailFeedback(null);
    try {
      const isCancellation = selectedAuthForResendEmail.status === 'CANCELADO_POR_ERRO' || selectedAuthForResendEmail.status === 'cancelled_error';
      const res = isCancellation
        ? await apiClient.resendCancellationNotification(
            selectedAuthForResendEmail.id,
            resendEmailInput.trim(),
            selectedAuthForResendEmail.cancellationReason
          )
        : await apiClient.resendSignedDocumentNotification(
            selectedAuthForResendEmail.id,
            resendEmailInput.trim()
          );
      setIsResendingEmail(false);
      if (res && res.success) {
        setResendEmailFeedback({
          success: true,
          message: isCancellation
            ? `Notificação de cancelamento enviada com sucesso para ${resendEmailInput.trim()}!`
            : `Comprovante de assinatura eletrônica enviado com sucesso para ${resendEmailInput.trim()}!`,
        });
        setTimeout(() => {
          setShowResendEmailModal(false);
        }, 2500);
      } else {
        setResendEmailFeedback({
          success: false,
          message: res?.error || 'Falha ao despachar e-mail.',
        });
      }
    } catch (err: any) {
      setIsResendingEmail(false);
      setResendEmailFeedback({
        success: false,
        message: err?.message || 'Erro de conexão ao despachar notificação.',
      });
    }
  };

  const getSubTabCounts = () => {
    const baseFiltered = authorizations.filter((auth) => {
      const matchesSearch =
        auth.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auth.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auth.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auth.validationCode && auth.validationCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (auth.minorSeries && auth.minorSeries.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (auth.minorClass && auth.minorClass.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (auth.minorTurn && auth.minorTurn.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesInstitution =
        selectedInstitution === 'all' ||
        auth.institutionId === selectedInstitution ||
        (auth.institutionName && auth.institutionName.toLowerCase().includes(selectedInstitution.toLowerCase()));

      const matchesImage =
        selectedImageOption === 'all' ||
        (selectedImageOption === 'authorized' && auth.authImage === true) ||
        (selectedImageOption === 'not_authorized' && auth.authImage === false);

      const matchesSeries =
        selectedSeries === 'all' ||
        (auth.minorSeries && auth.minorSeries.toLowerCase().includes(selectedSeries.toLowerCase()));

      const matchesTurn =
        selectedTurn === 'all' ||
        (auth.minorTurn && auth.minorTurn.toLowerCase() === selectedTurn.toLowerCase());

      let matchesDate = true;
      if (selectedDateRange !== 'all') {
        const now = new Date();
        const authDate = new Date(auth.signedAtDate);
        const diffTime = Math.abs(now.getTime() - authDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (selectedDateRange === 'today') {
          matchesDate = now.toDateString() === authDate.toDateString();
        } else if (selectedDateRange === '7days') {
          matchesDate = diffDays <= 7;
        } else if (selectedDateRange === '30days') {
          matchesDate = diffDays <= 30;
        }
      }

      return matchesSearch && matchesInstitution && matchesImage && matchesDate && matchesSeries && matchesTurn;
    });

    const activeCount = baseFiltered.filter(a => a.status === 'signed' || a.status === 'pending' || a.status === 'draft').length;
    const cancelledCount = baseFiltered.filter(a => a.status === 'CANCELADO_POR_ERRO' || a.status === 'cancelled_error' || a.status === 'revoked').length;
    const totalCount = baseFiltered.length;

    return { activeCount, cancelledCount, totalCount };
  };

  const { activeCount, cancelledCount, totalCount } = getSubTabCounts();

  const filteredAuths = useMemo(() => {
    return authorizations.filter((auth) => {
      const matchesSearch =
        auth.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auth.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auth.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (auth.validationCode && auth.validationCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (auth.minorSeries && auth.minorSeries.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (auth.minorClass && auth.minorClass.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (auth.minorTurn && auth.minorTurn.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesInstitution =
        selectedInstitution === 'all' ||
        auth.institutionId === selectedInstitution ||
        (auth.institutionName && auth.institutionName.toLowerCase().includes(selectedInstitution.toLowerCase()));

      const matchesStatus = (() => {
        if (subTab === 'active') {
          const isActive = auth.status === 'signed' || auth.status === 'pending' || auth.status === 'draft';
          if (!isActive) return false;
        } else if (subTab === 'cancelled') {
          const isCancelOrRevoke = auth.status === 'CANCELADO_POR_ERRO' || auth.status === 'cancelled_error' || auth.status === 'revoked';
          if (!isCancelOrRevoke) return false;
        }

        if (selectedStatus === 'all') return true;
        return (
          auth.status === selectedStatus ||
          (selectedStatus === 'CANCELADO_POR_ERRO' && (auth.status === 'CANCELADO_POR_ERRO' || auth.status === 'cancelled_error'))
        );
      })();

      const matchesImage =
        selectedImageOption === 'all' ||
        (selectedImageOption === 'authorized' && auth.authImage === true) ||
        (selectedImageOption === 'not_authorized' && auth.authImage === false);

      const matchesSeries =
        selectedSeries === 'all' ||
        (auth.minorSeries && auth.minorSeries.toLowerCase().includes(selectedSeries.toLowerCase()));

      const matchesTurn =
        selectedTurn === 'all' ||
        (auth.minorTurn && auth.minorTurn.toLowerCase() === selectedTurn.toLowerCase());

      let matchesDate = true;
      if (selectedDateRange !== 'all') {
        const now = new Date();
        const authDate = new Date(auth.signedAtDate);
        const diffTime = Math.abs(now.getTime() - authDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (selectedDateRange === 'today') {
          matchesDate = now.toDateString() === authDate.toDateString();
        } else if (selectedDateRange === '7days') {
          matchesDate = diffDays <= 7;
        } else if (selectedDateRange === '30days') {
          matchesDate = diffDays <= 30;
        }
      }

      return matchesSearch && matchesInstitution && matchesStatus && matchesImage && matchesDate && matchesSeries && matchesTurn;
    });
  }, [authorizations, searchTerm, selectedInstitution, subTab, selectedStatus, selectedImageOption, selectedSeries, selectedTurn, selectedDateRange]);

  const totalSigned = authorizations.filter((a) => a.status === 'signed').length;
  const totalImageAuthorized = filteredAuths.filter((a) => a.authImage && a.status === 'signed').length;
  const signedPercentage = authorizations.length > 0 ? ((totalSigned / authorizations.length) * 100).toFixed(1) : '0';

  // Paginação
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredAuths.length / pageSize));
  const paginatedAuths = useMemo(() => {
    if (pageSize === 0) return filteredAuths;
    const start = (currentPage - 1) * pageSize;
    return filteredAuths.slice(start, start + pageSize);
  }, [filteredAuths, currentPage, pageSize]);

  /**
   * Exporta a lista consolidada em formato CSV compatível com Excel (BOM UTF-8)
   */
  const handleExportCsv = async () => {
    if (filteredAuths.length === 0) {
      alert('Nenhuma autorização disponível para exportar com os filtros atuais.');
      return;
    }

    await apiClient.logAdminExport({
      export_type: 'CSV_CONSOLIDATED',
      record_count: filteredAuths.length,
      filters_applied: JSON.stringify({ institution: selectedInstitution, status: selectedStatus, search: searchTerm }),
    });

    const headers = [
      'Código Validação',
      'Estudante / Aluno',
      'Data Nascimento',
      'Série/Ano',
      'Turma',
      'Turno',
      'Instituição / Escola',
      'Responsável Legal',
      'CPF Responsável',
      'Parentesco / Vínculo',
      'Status',
      'Oftalmologia',
      'Audiometria',
      'Odontologia',
      'Psicologia',
      'Nutrição',
      'Tratamento de Dados (LGPD)',
      'Uso de Imagem e Voz',
      'Data da Assinatura',
      'Hash do Manifesto (SHA-256)'
    ];

    const rows = filteredAuths.map((a) => [
      `"${a.validationCode || a.id}"`,
      `"${a.studentName}"`,
      `"${a.birthDate || ''}"`,
      `"${a.minorSeries || ''}"`,
      `"${a.minorClass || ''}"`,
      `"${a.minorTurn || ''}"`,
      `"${a.institutionName}"`,
      `"${a.parentName}"`,
      `"${a.parentCpfMasked}"`,
      `"${a.relationship}"`,
      `"${a.status === 'signed' ? 'AUTORIZADO' : (a.status === 'CANCELADO_POR_ERRO' || a.status === 'cancelled_error') ? 'CANCELADO POR ERRO (INVALIDADO)' : a.status === 'revoked' ? 'NEGADO (REVOGADO)' : 'PENDENTE'}"`,
      `"${a.optInOftalmo ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}"`,
      `"${a.optInAudio ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}"`,
      `"${a.optInOdonto ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}"`,
      `"${a.optInPsico ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}"`,
      `"${a.optInNutri ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}"`,
      `"AUTORIZADO"`,
      `"${a.authImage ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}"`,
      `"${a.dateSent}"`,
      `"${a.hash || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_autorizacoes_sesi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Empacota e baixa todos os PDFs das autorizações filtradas em um arquivo ZIP
   */
  const handleExportZipPdfs = async () => {
    if (filteredAuths.length === 0) {
      alert('Nenhuma autorização disponível para baixar em ZIP.');
      return;
    }

    setIsExportingZip(true);
    try {
      await apiClient.logAdminExport({
        export_type: 'ZIP_PDFS',
        record_count: filteredAuths.length,
        filters_applied: JSON.stringify({ institution: selectedInstitution, status: selectedStatus, search: searchTerm }),
      });

      const zip = new JSZip();
      const folder = zip.folder('autorizacoes_assinadas_sesi');

      for (let i = 0; i < filteredAuths.length; i++) {
        const auth = filteredAuths[i];
        const pdfBytes = await GeradorPdfTermoSesi.gerarPdfOriginal({
          tituloProcedimento: auth.activity,
          descricaoProcedimento: 'Autorização e Consentimento para Atendimento em Saúde e Exames Clínicos — Escola Cidadã — Saúde em Movimento.',
          nomeMenor: auth.studentName,
          dataNascimentoMenor: auth.birthDate || '2010-01-01',
          nomeResponsavel: auth.parentName,
          cpfResponsavelMascarado: auth.parentCpfMasked,
          parentesco: auth.relationship,
          autorizacaoSaude: true,
          autorizacaoDados: true,
          autorizacaoImagem: auth.authImage,
          hashManifesto: auth.hash,
          dataAssinatura: auth.signedAtDate,
          tipoAssinatura: 'ELETRONICA_AVANCADA',
        });

        const sanitizedName = auth.studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `${auth.validationCode}_${sanitizedName}.pdf`;
        folder?.file(fileName, pdfBytes);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `autorizacoes_sesi_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Erro ao gerar arquivo ZIP: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-7 max-w-full mx-auto space-y-6 animate-in fade-in duration-300">

      {/* ━━ 1. HERO HEADER CORPORATIVO ━━ */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-[#002f5a] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/80 overflow-hidden">
        {/* Efeitos visuais de fundo */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Título e Identificação */}
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-bold tracking-wider uppercase backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>PLATAFORMA CATRAKI ATIVA &bull; SESI / UnB</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Painel Gestor de Autorizações
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed max-w-xl">
              Acompanhamento pericial e gestão de termos de consentimento da campanha 
              <strong className="text-blue-200"> "Saúde em Movimento"</strong> com integridade SHA-256 e LGPD.
            </p>
          </div>

          {/* Usuário e Ações Principais */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            {currentUser && (
              <div className="flex items-center gap-3.5 px-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-inner backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white font-black flex items-center justify-center text-sm shadow-md border border-white/20">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[240px]">
                      {currentUser.name}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 border border-blue-400/40 text-[9px] font-black rounded-md uppercase tracking-wider">
                      {currentUser.role === 'admin_master' ? 'Master' : 'Gestor'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px] sm:max-w-[260px]">
                    {currentUser.email}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setShowNewSchoolModal(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Escola</span>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sair do Painel Gestor"
                  className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700/80 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ━━ 2. CARDS DE MÉTRICAS / KPIS (HIGH-END) ━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Filtrados */}
        <div className="stat-card-modern p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Registros Filtrados</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{filteredAuths.length}</span>
              <span className="text-xs text-slate-500 font-semibold">de {authorizations.length}</span>
            </div>
            <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" />
              {isFiltered ? 'Filtros ativos' : 'Visão completa'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Assinadas / Adesão */}
        <div className="stat-card-modern p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Autorizações Assinadas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">{totalSigned}</span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {signedPercentage}% adesão
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${signedPercentage}%` }} />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Imagem & Voz */}
        <div className="stat-card-modern p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Uso de Imagem &amp; Voz</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-sky-700">{totalImageAuthorized}</span>
              <span className="text-xs text-slate-500 font-semibold">alunos autorizados</span>
            </div>
            <span className="text-[11px] text-sky-700 font-medium flex items-center gap-1">
              <Camera className="w-3 h-3 text-sky-600" />
              Fotos institucionais
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 shadow-sm">
            <Camera className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Escolas / Unidades */}
        <div className="stat-card-modern p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Escolas Ativas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-800">{institutions.length}</span>
              <span className="text-xs text-slate-500 font-semibold">unidades cadastradas</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Rotas ativas 100%
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ━━ 3. TABS PRINCIPAIS E AÇÕES ━━ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        
        {/* Abas */}
        <div className="inline-flex p-1 bg-slate-200/80 rounded-2xl border border-slate-300/80 shadow-2xs backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('authorizations')}
            className={`px-5 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'authorizations'
                ? 'bg-white text-[#004b8d] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Autorizações Clínicas</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'authorizations' ? 'bg-blue-100 text-blue-900' : 'bg-slate-300/80 text-slate-700'
            }`}>
              {filteredAuths.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('schools')}
            className={`px-5 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'schools'
                ? 'bg-white text-[#004b8d] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Escolas &amp; Links</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'schools' ? 'bg-blue-100 text-blue-900' : 'bg-slate-300/80 text-slate-700'
            }`}>
              {institutions.length}
            </span>
          </button>
        </div>

        {/* Botões de Exportação */}
        {activeTab === 'authorizations' && (
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleExportZipPdfs}
              disabled={isExportingZip || filteredAuths.length === 0}
              className="btn-primary-grad px-4 py-2.5 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
            >
              {isExportingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Compactando ZIP...</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 text-blue-200" />
                  <span>ZIP de PDFs</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ━━ 4. CONTEÚDO DA ABA: AUTORIZAÇÕES ━━ */}
      {activeTab === 'authorizations' && (
        <div className="space-y-4">

          {/* PAINEL DE COMANDO & FILTROS INTELIGENTES */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-5 space-y-4">
            
            {/* Linha de Busca + Filtros Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              
              {/* Campo de Busca Rápida */}
              <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="admin-search-input"
                  name="adminSearchTerm"
                  type="text"
                  aria-label="Buscar por aluno, responsável ou código"
                  placeholder="Buscar aluno, responsável, CPF..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-input-modern w-full pl-10 pr-9 py-2.5 text-xs text-slate-800 font-medium placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtro de Status */}
              <div className="relative">
                <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusFilterChange(e.target.value as any)}
                  className="filter-input-modern w-full pl-9 pr-7 py-2.5 text-xs text-slate-700 font-medium cursor-pointer appearance-none"
                >
                  <option value="all">Status: Todos</option>
                  <option value="signed">✅ Autorizadas</option>
                  <option value="pending">⏳ Pendentes</option>
                  <option value="revoked">🚫 Negadas</option>
                  <option value="CANCELADO_POR_ERRO">⚠️ Canceladas</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Filtro de Escola */}
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={selectedInstitution}
                  onChange={(e) => {
                    setSelectedInstitution(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-input-modern w-full pl-9 pr-7 py-2.5 text-xs text-slate-700 font-medium cursor-pointer appearance-none"
                >
                  <option value="all">Todas as Escolas</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.short_name} - {inst.city}/{inst.state}</option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Filtro de Série */}
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={selectedSeries}
                  onChange={(e) => {
                    setSelectedSeries(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-input-modern w-full pl-9 pr-7 py-2.5 text-xs text-slate-700 font-medium cursor-pointer appearance-none"
                >
                  <option value="all">Série: Todas</option>
                  <option value="1º Ano">1º Ano</option>
                  <option value="2º Ano">2º Ano</option>
                  <option value="3º Ano">3º Ano</option>
                  <option value="4º Ano">4º Ano</option>
                  <option value="9º Ano">9º Ano</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Filtro de Período */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={selectedDateRange}
                  onChange={(e) => {
                    setSelectedDateRange(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="filter-input-modern w-full pl-9 pr-7 py-2.5 text-xs text-slate-700 font-medium cursor-pointer appearance-none"
                >
                  <option value="all">Período: Todo</option>
                  <option value="today">📅 Hoje</option>
                  <option value="7days">📅 Últimos 7 dias</option>
                  <option value="30days">📅 Últimos 30 dias</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

            </div>

            {/* Linha 2: Segmented Tabs & Quick Status Pills */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSubTabChange('active')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    subTab === 'active'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Ativas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    subTab === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {activeCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubTabChange('cancelled')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    subTab === 'cancelled'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Canceladas &amp; Negadas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    subTab === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {cancelledCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubTabChange('all')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    subTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Todas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    subTab === 'all' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {totalCount}
                  </span>
                </button>
              </div>

              {/* Informações e Botão de Limpar Filtros */}
              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
                {isFiltered && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar Filtros</span>
                  </button>
                )}

                <div className="font-semibold">
                  Exibindo <strong className="text-slate-900 font-black">{filteredAuths.length}</strong> de <strong className="text-slate-900 font-black">{authorizations.length}</strong> registros
                </div>
              </div>

            </div>

          </div>

          {/* ━━ 5. TABELA ULTRA-MODERNA E ESPAÇOSA ━━ */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[980px]">
                <thead className="table-thead-ultra">
                  <tr>
                    <th className="w-[13%] min-w-[130px]">Código / Protocolo</th>
                    <th className="w-[23%] min-w-[240px]">Paciente / Aluno</th>
                    <th className="w-[14%] min-w-[150px]">Turma &amp; Turno</th>
                    <th className="w-[18%] min-w-[190px]">Responsável Legal</th>
                    <th className="w-[11%] min-w-[120px]">Escola</th>
                    <th className="w-[11%] min-w-[130px]">Status</th>
                    <th className="w-[10%] min-w-[190px] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAuths.length > 0 ? (
                    paginatedAuths.map((auth) => {
                      const isSigned = auth.status === 'signed';
                      const isCancelled = auth.status === 'CANCELADO_POR_ERRO' || auth.status === 'cancelled_error';
                      const isRevoked = auth.status === 'revoked';
                      const isPending = !isSigned && !isCancelled && !isRevoked;
                      const birthInfo = formatBirthDateAndAge(auth.birthDate);
                      const seriesClassText = formatStudentSeriesClass(auth.minorSeries, auth.minorClass);
                      const initials = getInitials(auth.studentName);
                      const gradient = getAvatarGradient(auth.studentName);
                      const isCopied = copiedCode === (auth.validationCode || auth.id);

                      return (
                        <tr 
                          key={auth.id} 
                          className={`table-row-ultra group ${
                            isCancelled ? 'bg-rose-50/20 hover:bg-rose-50/40' : ''
                          }`}
                        >
                          {/* Col 1: Código / Protocolo */}
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1">
                              <button
                                onClick={() => handleCopyCode(auth.validationCode || auth.id)}
                                className="badge-code-modern cursor-pointer hover:scale-105 active:scale-95"
                                title="Clique para copiar o código do documento"
                              >
                                <span>{auth.validationCode || auth.id}</span>
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                                )}
                              </button>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {auth.dateSent}
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Paciente / Aluno */}
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0 mt-0.5`}>
                                {initials}
                              </div>
                              <div className="space-y-1 min-w-0">
                                <div className="font-bold text-slate-900 text-sm leading-snug break-words">
                                  {auth.studentName}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                                    {auth.studentCpfMasked}
                                  </span>
                                  {birthInfo && (
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                      birthInfo.isAdult 
                                        ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                      <Cake className="w-3 h-3" />
                                      <span>{birthInfo.formattedDate}{birthInfo.age ? ` (${birthInfo.age})` : ''}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Col 3: Turma & Turno */}
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1.5">
                              {seriesClassText ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 text-[#004b8d] border border-blue-200/80 text-xs font-bold">
                                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{seriesClassText}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">— Não informada —</span>
                              )}
                              {auth.minorTurn && (
                                <div className="text-[11px] text-slate-500 font-medium capitalize flex items-center gap-1">
                                  <span>{auth.minorTurn === 'Matutino' ? '☀️' : auth.minorTurn === 'Vespertino' ? '🕒' : '🌙'}</span>
                                  <span>Turno {auth.minorTurn}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Col 4: Responsável Legal */}
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                                {auth.parentName}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono text-slate-400">
                                  {auth.parentCpfMasked}
                                </span>
                                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-bold text-slate-700 uppercase">
                                  {auth.relationship}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Col 5: Escola */}
                          <td className="px-4 py-4 align-top">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold">
                              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{auth.institutionName}</span>
                            </span>
                          </td>

                          {/* Col 6: Status & Consentimentos */}
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1.5">
                              {isSigned && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-3xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Autorizada</span>
                                </span>
                              )}
                              {isCancelled && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold shadow-3xs">
                                  <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>Cancelada</span>
                                </span>
                              )}
                              {isRevoked && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold shadow-3xs">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>Negada</span>
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Pendente</span>
                                </span>
                              )}

                              {/* Badges Adicionais (Foto e 2FA) */}
                              {isSigned && (
                                <div className="flex items-center gap-1">
                                  {auth.authImage && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                      <Camera className="w-2.5 h-2.5" />
                                      <span>Foto/Voz</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Col 7: Ações Rápidas */}
                          <td className="px-4 py-4 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Botão Ficha (Principal) */}
                              <button
                                onClick={() => handleOpenDetailsModal(auth)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#004b8d] hover:bg-[#003666] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-95"
                                title="Ver Ficha Cadastral e Triagem Médica"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Ficha</span>
                              </button>

                              {/* Botão Baixar PDF (se cancelado ou assinado) */}
                              {(isSigned || isCancelled) && (
                                <button
                                  onClick={async () => {
                                    await apiClient.downloadDocumentCertificate(auth.id);
                                  }}
                                  className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 text-xs font-bold transition-all cursor-pointer active:scale-95"
                                  title="Baixar Certificado PDF com Hash"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                                </button>
                              )}

                              {/* Botão Reenviar E-mail */}
                              <button
                                onClick={() => handleOpenResendEmailModal(auth)}
                                className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 transition-all cursor-pointer active:scale-95"
                                title="Reenviar Notificação por E-mail"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>

                              {/* Botão Revogar / Cancelar por Erro */}
                              {!isCancelled && (
                                <button
                                  onClick={() => handleOpenRevokeModal(auth)}
                                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                                  title="Anular ou Cancelar Autorização"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Revogar</span>
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <AlertTriangle className="w-7 h-7" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">Nenhuma autorização encontrada</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Nenhum registro corresponde aos filtros de busca ou seleção aplicados.
                          </p>
                          {isFiltered && (
                            <button
                              onClick={handleResetFilters}
                              className="px-4 py-2 bg-[#004b8d] text-white text-xs font-bold rounded-xl hover:bg-[#003666] transition-colors cursor-pointer"
                            >
                              Limpar Todos os Filtros
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ━━ RODAPÉ DA TABELA COM PAGINAÇÃO ━━ */}
            {filteredAuths.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                
                {/* Itens por página */}
                <div className="flex items-center gap-2">
                  <span>Exibir por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-blue-600"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={0}>Todos ({filteredAuths.length})</option>
                  </select>
                  <span className="text-slate-400">
                    &bull; Mostrando {pageSize === 0 ? filteredAuths.length : Math.min(filteredAuths.length, (currentPage - 1) * pageSize + 1)} - {pageSize === 0 ? filteredAuths.length : Math.min(filteredAuths.length, currentPage * pageSize)} de {filteredAuths.length}
                  </span>
                </div>

                {/* Controles de Página */}
                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title="Página Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800">
                      Página {currentPage} de {totalPages}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title="Próxima Página"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━ 6. CONTEÚDO DA ABA: GESTÃO DE ESCOLAS & INSTITUIÇÕES ━━ */}
      {activeTab === 'schools' && (
        <div className="space-y-4">
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 sm:p-5 text-xs text-blue-900 leading-relaxed flex items-start gap-3.5 shadow-2xs">
            <LinkIcon className="w-5 h-5 text-[#004b8d] shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-blue-950 mb-1">Como funciona o roteamento por escola:</strong>
              Qualquer link no formato <code className="bg-blue-100 px-2 py-0.5 rounded font-mono text-blue-950 font-bold">/autorizar/[slug-da-escola]</code> carrega o termo de consentimento personalizado com o nome daquela instituição de ensino. Basta cadastrar a escola abaixo e copiar o link para enviar aos pais!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {institutions.map((inst) => {
              const isCopied = copiedSlug === inst.id;
              const directUrl = `${window.location.origin}/autorizar/${inst.id}`;

              return (
                <div 
                  key={inst.id}
                  className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-mono border border-slate-200">
                          /{inst.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                          {inst.city} - {inst.state}
                        </span>
                      </div>
                      {inst.id !== 'cemeit' && (
                        <button
                          onClick={() => handleDeactivateSchool(inst.id)}
                          className="text-slate-400 hover:text-rose-700 transition-colors px-2 py-1 rounded-lg text-xs font-semibold hover:bg-rose-50 cursor-pointer"
                          title="Desativar rota desta escola"
                        >
                          <span>Desativar</span>
                        </button>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-mono break-all bg-slate-50 p-3 rounded-xl border border-slate-200/70 select-all">
                      {directUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleCopySchoolLink(inst.id)}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isCopied 
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-[#004b8d] hover:bg-[#003666] text-white shadow-sm'
                      }`}
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopied ? 'Link Copiado!' : 'Copiar Link dos Pais'}</span>
                    </button>

                    <button
                      onClick={() => onNavigateToSignerToken('projeto-escola-cidada-2026', inst.id)}
                      className="py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      title="Abrir formulário desta escola"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                      <span>Abrir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━ 7. MODAIS INTEGRADOS ━━ */}

      {/* MODAL: CADASTRAR NOVA ESCOLA */}
      {showNewSchoolModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#004b8d] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Cadastrar Nova Escola</h2>
                  <p className="text-xs text-slate-500">Crie um link exclusivo para uma instituição</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNewSchoolModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {schoolFormError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {schoolFormError}
              </div>
            )}

            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="school-name" className="text-xs font-bold text-slate-700 uppercase">
                  Nome Completo da Escola <span className="text-red-500">*</span>
                </label>
                <input
                  id="school-name"
                  name="schoolName"
                  type="text"
                  required
                  placeholder="Ex: Centro Educacional 03 de Sobradinho"
                  value={newSchoolData.name}
                  onChange={(e) => setNewSchoolData({ ...newSchoolData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#004b8d]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="school-short-name" className="text-xs font-bold text-slate-700 uppercase">
                    Sigla / Nome Curto <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="school-short-name"
                    name="schoolShortName"
                    type="text"
                    required
                    placeholder="Ex: CED 03 Sobradinho"
                    value={newSchoolData.short_name}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, short_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#004b8d]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="school-id-slug" className="text-xs font-bold text-slate-700 uppercase">
                    Slug da URL (Identificador)
                  </label>
                  <input
                    id="school-id-slug"
                    name="schoolSlug"
                    type="text"
                    placeholder="Ex: ced03 (opcional)"
                    value={newSchoolData.id}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-[#004b8d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="school-city" className="text-xs font-bold text-slate-700 uppercase">Cidade</label>
                  <input
                    id="school-city"
                    name="schoolCity"
                    type="text"
                    placeholder="Ex: Sobradinho"
                    value={newSchoolData.city}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#004b8d]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="school-state" className="text-xs font-bold text-slate-700 uppercase">UF</label>
                  <input
                    id="school-state"
                    name="schoolState"
                    type="text"
                    maxLength={2}
                    placeholder="DF"
                    value={newSchoolData.state}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, state: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#004b8d]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewSchoolModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-[#004b8d] hover:bg-[#003666] text-white rounded-xl transition-colors shadow-xs cursor-pointer text-center"
                >
                  Salvar Escola e Gerar Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST DE FEEDBACK DE REVOGAÇÃO / SUCESSO */}
      {revocationSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="block font-bold text-white mb-0.5">Operação Concluída com Sucesso</strong>
            <span className="text-slate-300">{revocationSuccessToast}</span>
          </div>
          <button
            onClick={() => setRevocationSuccessToast(null)}
            className="text-slate-400 hover:text-white ml-auto shrink-0 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL DE REVOGAÇÃO / ANULAÇÃO DE DOCUMENTO */}
      {showRevocationModal && selectedAuthToRevoke && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => !isRevoking && setShowRevocationModal(false)}
        >
          <div 
            className="document-sheet-a4 max-w-2xl w-full animate-in zoom-in-95 duration-200 text-left my-6 space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Timbrado Oficial */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-[#034b7f] pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/catraki.png"
                  alt="Catraki Logo"
                  className="h-8 sm:h-9 w-auto object-contain rounded"
                />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Solicitação de Anulação de Documento
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Revogação administrativa de autorização por inconsistência cadastral ou operacional
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] text-slate-500 m-0 uppercase tracking-wider font-semibold">
                    PLATAFORMA CATRAKI
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-800 m-0">
                    Doc. nº {selectedAuthToRevoke.validationCode || selectedAuthToRevoke.id}
                  </p>
                </div>
                <button
                  onClick={() => !isRevoking && setShowRevocationModal(false)}
                  disabled={isRevoking}
                  className="text-slate-400 hover:text-slate-600 rounded-xl p-2 transition-colors cursor-pointer disabled:opacity-50"
                  title="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Aviso de Alerta */}
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Atenção: Processo de Anulação do Termo</h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Você está prestes a anular administrativamente a autorização de atendimento de saúde. Esta ação é definitiva.
                </p>
              </div>
            </div>

            {/* Resumo do Item / Documento Alvo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Protocolo de Assinatura:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {selectedAuthToRevoke.validationCode || selectedAuthToRevoke.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tipo de Documento:</span>
                  <span className="font-bold text-slate-800 truncate block">Termo de Consentimento — Escola Cidadã — Saúde em Movimento</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Estudante / Aluno(a):</span>
                  <span className="font-bold text-slate-800 truncate block">{selectedAuthToRevoke.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Responsável Legal:</span>
                  <span className="font-bold text-slate-800 truncate block">{selectedAuthToRevoke.parentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Escola / Unidade:</span>
                  <span className="font-medium text-slate-700 truncate block">{selectedAuthToRevoke.institutionName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Situação Vigente:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block w-fit text-xs mt-0.5">
                    {formatStatusInPortuguese(selectedAuthToRevoke.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Aviso de Impacto */}
            <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-4 text-xs text-rose-950 leading-relaxed space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <Info className="w-4 h-4 text-rose-700 shrink-0" />
                <span>Aviso de Impacto do Cancelamento:</span>
              </div>
              <p className="text-[12px] text-rose-900 font-medium leading-relaxed">
                Esta ação é permanente. Os links de assinatura serão desativados agora mesmo e o responsável receberá uma notificação automática no e-mail cadastrado no momento do envio do código de verificação.
              </p>
            </div>

            {/* Formulário: Justificativa Obrigatória */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label htmlFor="revocation-reason" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Por favor, explique o motivo do cancelamento <span className="text-red-500">*</span>
                </label>
                <span className={`text-[11px] font-mono font-semibold ${revocationReason.trim().length >= 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {revocationReason.trim().length}/10 caracteres mín.
                </span>
              </div>
              <textarea
                id="revocation-reason"
                name="revocationReason"
                rows={3}
                required
                disabled={isRevoking}
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="Descreva o motivo da anulação/revogação (ex: erro de digitação do CPF na matrícula)..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400 leading-relaxed resize-none disabled:bg-slate-100"
              />
            </div>

            {/* Checkbox de Confirmação */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
              <input
                id="confirm-revocation-checkbox"
                name="confirmRevocation"
                type="checkbox"
                disabled={isRevoking}
                checked={revocationConfirmed}
                onChange={(e) => setRevocationConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-700 leading-snug">
                Estou ciente de que a anulação é <strong>permanente e irreversível</strong> (soft delete normativo), e que meu usuário e IP serão gravados na trilha de auditoria forense.
              </span>
            </label>

            {/* Alerta de Erro */}
            {revocationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{revocationError}</span>
              </div>
            )}

            {/* Botões de Decisão */}
            <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isRevoking}
                onClick={() => setShowRevocationModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isRevoking || revocationReason.trim().length < 10 || !revocationConfirmed}
                onClick={handleConfirmRevoke}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Anulando documento...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Sim, anular documento</span>
                  </>
                )}
              </button>
            </div>

            {/* Barra institucional azul sólida no final da folha */}
            <div className="absolute bottom-0 left-0 right-0 h-2.5 sm:h-3.5 bg-[#034b7f] pointer-events-none z-10" />

            {/* Número de página */}
            <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
              1
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FICHA CADASTRAL E DE TRIAGEM CLÍNICA DO ESTUDANTE — FOLHA A4 (SESI SAÚDE) */}
      {showDetailsModal && selectedAuthForDetails && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setShowDetailsModal(false)}
        >
          <div 
            className="document-sheet-a4 max-w-3xl w-full animate-in zoom-in-95 duration-200 text-left my-6 space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Timbrado Oficial SESI / UnB (Padrão A4) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-[#034b7f] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#004b8d] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      Ficha do Estudante &bull; Escola Cidadã — Saúde em Movimento
                    </h3>
                    <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                      {selectedAuthForDetails.validationCode || selectedAuthForDetails.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Projeto Escola Cidadã: Saúde em Movimento (SESI-DF &bull; Universidade de Brasília)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrintStudentCard}
                  className="px-3 py-2 rounded-xl bg-blue-50 text-[#004b8d] hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Imprimir Ficha de Triagem em Folha A4"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-xl p-2 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid de Conteúdo A4 */}
            <div className="space-y-4">
              
              {/* Bloco 1: Identificação Escolar do Estudante */}
              <div className="bg-gradient-to-br from-blue-50/60 to-white border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-blue-100/80 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#004b8d]" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Identificação Escolar do Estudante</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                    selectedAuthForDetails.status === 'CANCELADO_POR_ERRO' || selectedAuthForDetails.status === 'cancelled_error'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {selectedAuthForDetails.status === 'CANCELADO_POR_ERRO' || selectedAuthForDetails.status === 'cancelled_error' ? (
                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                    <span>{formatStatusInPortuguese(selectedAuthForDetails.status)}</span>
                  </span>
                </div>

                {/* ALERTA DE CANCELAMENTO / REVOGAÇÃO ADMINISTRATIVA */}
                {(selectedAuthForDetails.status === 'CANCELADO_POR_ERRO' || selectedAuthForDetails.status === 'cancelled_error') && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs space-y-2 text-rose-950">
                    <div className="flex items-center justify-between border-b border-rose-200/80 pb-1.5 font-bold text-rose-900">
                      <div className="flex items-center gap-1.5">
                        <Ban className="w-4 h-4 text-rose-600" />
                        <span>Detalhes do Cancelamento (Soft Delete Pericial)</span>
                      </div>
                      <span className="font-mono text-[10px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        Art. 16 LGPD &amp; Art. 15 Marco Civil
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-rose-700 block text-[10px] uppercase font-bold">Data da Anulação:</span>
                        <span className="font-bold text-slate-800">{selectedAuthForDetails.cancelledAt || selectedAuthForDetails.revokedAt || selectedAuthForDetails.dateSent}</span>
                      </div>
                      <div>
                        <span className="text-rose-700 block text-[10px] uppercase font-bold">Motivo Registrado:</span>
                        <span className="font-semibold text-slate-900 block bg-white p-2 rounded-lg border border-rose-200 mt-0.5">
                          {selectedAuthForDetails.cancellationReason || selectedAuthForDetails.revokedReason || 'Inconsistência cadastral ou erro operacional'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Nome do Aluno(a):</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedAuthForDetails.studentName}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">CPF do Aluno(a):</span>
                    <span className="font-mono font-bold text-slate-800">{selectedAuthForDetails.studentCpfMasked}</span>
                  </div>

                  {/* DESTAQUE: ANO / SÉRIE, TURMA E TURNO */}
                  <div className="sm:col-span-2 bg-white rounded-xl p-3 border border-blue-200 shadow-2xs">
                    <span className="text-blue-900 block text-[10px] uppercase font-bold mb-2 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span>Enturmação Escolar Oficial na Unidade de Ensino:</span>
                    </span>
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-100">
                        <span className="text-[10px] text-blue-700 font-bold block uppercase">Ano / Série</span>
                        <strong className="text-xs sm:text-sm text-blue-950 font-bold">
                          {selectedAuthForDetails.minorSeries ? formatStudentSeriesClass(selectedAuthForDetails.minorSeries) : 'Não informado'}
                        </strong>
                      </div>
                      <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-100">
                        <span className="text-[10px] text-blue-700 font-bold block uppercase">Turma</span>
                        <strong className="text-xs sm:text-sm text-blue-950 font-bold">
                          {selectedAuthForDetails.minorClass ? `Turma ${selectedAuthForDetails.minorClass}` : 'Não informada'}
                        </strong>
                      </div>
                      <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-100">
                        <span className="text-[10px] text-blue-700 font-bold block uppercase">Turno</span>
                        <strong className="text-xs sm:text-sm text-blue-950 font-bold capitalize">
                          {selectedAuthForDetails.minorTurn || 'Matutino'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Data de Nascimento &amp; Idade:</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Cake className="w-3.5 h-3.5 text-slate-400" />
                      {formatBirthDateAndAge(selectedAuthForDetails.birthDate)?.formattedDate || 'Não informada'}
                      {formatBirthDateAndAge(selectedAuthForDetails.birthDate)?.age && (
                        <strong className="text-blue-700 ml-1">({formatBirthDateAndAge(selectedAuthForDetails.birthDate)?.age})</strong>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Instituição / Escola:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {selectedAuthForDetails.institutionName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Responsável Legal */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Responsável Legal Cadastrado</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Nome Completo:</span>
                    <span className="font-bold text-slate-900">{selectedAuthForDetails.parentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">CPF do Responsável:</span>
                    <span className="font-mono font-medium text-slate-800">{selectedAuthForDetails.parentCpfMasked}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Grau de Parentesco / Vínculo:</span>
                    <span className="inline-block bg-white px-2.5 py-0.5 rounded border border-slate-200 font-bold text-slate-800 capitalize">
                      {selectedAuthForDetails.relationship}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Grade de Atendimentos Clínicos Autorizados (SESI Saúde) */}
              <div className="border border-emerald-200/60 bg-emerald-50/20 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Grade de Atendimentos Autorizados
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    SESI 5 em 1
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-slate-800 shadow-2xs">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Oftalmologia</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-slate-800 shadow-2xs">
                    <Ear className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Audiometria</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-slate-800 shadow-2xs">
                    <Smile className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Odontologia</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-slate-800 shadow-2xs">
                    <Apple className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nutrição</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-slate-800 shadow-2xs">
                    <Brain className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Psicologia</span>
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs bg-white border ${
                    selectedAuthForDetails.authImage ? 'border-blue-200 text-slate-800' : 'border-slate-200 text-slate-400'
                  }`}>
                    <Camera className={`w-3.5 h-3.5 ${selectedAuthForDetails.authImage ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Uso de Imagem: {selectedAuthForDetails.authImage ? 'Autorizado ✓' : 'Não Autorizado ✕'}</span>
                  </span>
                </div>
              </div>

              {/* Bloco 4: Trilha de Auditoria e Hash Criptográfico */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Hash SHA-256 do Manifesto:</span>
                  <span className="font-mono text-xs text-slate-600 truncate max-w-[340px] bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedAuthForDetails.hash}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                  <span>Assinatura Eletrônica Avançada (Lei nº 14.063/2020)</span>
                  <span>Data de Registro: {selectedAuthForDetails.dateSent}</span>
                </div>
              </div>

            </div>

            {/* Rodapé e Ações */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              {selectedAuthForDetails.hash && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    onNavigateToValidatorHash(selectedAuthForDetails.hash);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-[#004b8d] hover:bg-blue-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 border border-blue-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir no Validador Público</span>
                </button>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handlePrintStudentCard}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-[#004b8d] hover:bg-[#003666] text-white rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ficha A4</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: REENVIAR E-MAIL */}
      {showResendEmailModal && selectedAuthForResendEmail && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowResendEmailModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Reenviar Notificação por E-mail
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Disparo de transparência e comprovante oficial com trilha de auditoria
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResendEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Documento */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Código do Termo:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {selectedAuthForResendEmail.validationCode || selectedAuthForResendEmail.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Estudante:</span>
                  <span className="font-bold text-slate-900 truncate block">{selectedAuthForResendEmail.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Responsável Legal:</span>
                  <span className="font-bold text-slate-800 truncate block">{selectedAuthForResendEmail.parentName}</span>
                </div>
              </div>
            </div>

            {/* Input de E-mail */}
            <div className="space-y-2">
              <label htmlFor="resend-email-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                E-mail de Destino <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="resend-email-input"
                  type="email"
                  value={resendEmailInput}
                  disabled={isResendingEmail}
                  onChange={(e) => setResendEmailInput(e.target.value)}
                  placeholder="Digite o e-mail (ex: pai.responsavel@gmail.com)..."
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 placeholder:text-slate-400 disabled:bg-slate-100"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                O e-mail será despachado imediatamente com o layout formal timbrado do SESI e protocolo de validação.
              </p>
            </div>

            {/* Mensagem de Feedback */}
            {resendEmailFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                resendEmailFeedback.success 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {resendEmailFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{resendEmailFeedback.message}</span>
              </div>
            )}

            {/* Ações */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isResendingEmail}
                onClick={() => setShowResendEmailModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResendingEmail || !resendEmailInput.trim() || !resendEmailInput.includes('@')}
                onClick={handleConfirmResendEmail}
                className="px-5 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando E-mail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Disparar E-mail Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
