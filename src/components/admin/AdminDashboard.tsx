import React, { useState, useEffect } from 'react';
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
  Send
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
  const [subTab, setSubTab] = useState<'active' | 'cancelled' | 'all'>('active');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showNewSchoolModal, setShowNewSchoolModal] = useState(false);

  const handleStatusFilterChange = (status: 'all' | 'signed' | 'pending' | 'revoked' | 'CANCELADO_POR_ERRO') => {
    setSelectedStatus(status);
    if (status === 'signed' || status === 'pending') {
      setSubTab('active');
    } else if (status === 'revoked' || status === 'CANCELADO_POR_ERRO') {
      setSubTab('cancelled');
    }
  };

  const handleSubTabChange = (tab: 'active' | 'cancelled' | 'all') => {
    setSubTab(tab);
    if (tab === 'active' && (selectedStatus === 'revoked' || selectedStatus === 'CANCELADO_POR_ERRO')) {
      setSelectedStatus('all');
    } else if (tab === 'cancelled' && (selectedStatus === 'signed' || selectedStatus === 'pending')) {
      setSelectedStatus('all');
    }
  };

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

  // Estados do Modal de Reenvio de E-mail de Cancelamento
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

          // Prioriza o nome real digitado pelo responsável legal no momento da assinatura
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
      return { formattedDate: str, age: null };
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
    };
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
        // notify_email omitido — o backend descriptografa automaticamente o e-mail cadastrado
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
          `Autorização ${selectedAuthToRevoke.validationCode || selectedAuthToRevoke.id} revogada por inconsistência operacional.${emailMsg}`
        );
        setTimeout(() => setRevocationSuccessToast(null), 8000);
      } else {
        setRevocationError(res?.error || 'Falha ao processar a revogação por erro. Verifique as permissões.');
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

      return matchesSearch && matchesInstitution && matchesImage && matchesDate && matchesSeries;
    });

    const activeCount = baseFiltered.filter(a => a.status === 'signed' || a.status === 'pending' || a.status === 'draft').length;
    const cancelledCount = baseFiltered.filter(a => a.status === 'CANCELADO_POR_ERRO' || a.status === 'cancelled_error' || a.status === 'revoked').length;
    const totalCount = baseFiltered.length;

    return { activeCount, cancelledCount, totalCount };
  };

  const { activeCount, cancelledCount, totalCount } = getSubTabCounts();

  const filteredAuths = authorizations.filter((auth) => {
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
      // 1. Filtro por sub-aba
      if (subTab === 'active') {
        const isActive = auth.status === 'signed' || auth.status === 'pending' || auth.status === 'draft';
        if (!isActive) return false;
      } else if (subTab === 'cancelled') {
        const isCancelOrRevoke = auth.status === 'CANCELADO_POR_ERRO' || auth.status === 'cancelled_error' || auth.status === 'revoked';
        if (!isCancelOrRevoke) return false;
      }

      // 2. Filtro por dropdown específico
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

    return matchesSearch && matchesInstitution && matchesStatus && matchesImage && matchesDate && matchesSeries;
  });

  const totalImageAuthorized = filteredAuths.filter((a) => a.authImage && a.status === 'signed').length;

  /**
   * Exporta a lista consolidada de autorizações em formato CSV compatível com Excel (BOM UTF-8)
   */
  const handleExportCsv = async () => {
    if (filteredAuths.length === 0) {
      alert('Nenhuma autorização disponível para exportar com os filtros atuais.');
      return;
    }

    // Registra operação de exportação na trilha imutável de auditoria (DLP / LGPD Art. 46 e 50)
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
      // Registra operação de download em lote na trilha de auditoria (DLP / LGPD Art. 46 e 50)
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
    <div className="p-2 sm:p-4 lg:p-6 max-w-full mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ━━ HEADER CORPORATIVO PREMIUM ━━ */}
      <div className="header-card rounded-2xl p-4 sm:p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">

        {/* Decoração geométrica de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] pointer-events-none">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="150" cy="50" r="120" fill="#1d4ed8"/>
            <circle cx="180" cy="150" r="80" fill="#3b82f6"/>
          </svg>
        </div>
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-blue-500/5 pointer-events-none" />

        {/* Lado esquerdo: Logo + Título */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100/80 text-blue-700 text-[10px] font-bold tracking-widest uppercase mb-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
            </span>
            PLATAFORMA CATRAKI ATIVA
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight leading-none">
            Painel Gestor
          </h1>
          <p className="text-slate-500 mt-1.5 text-xs sm:text-[13px] max-w-md leading-relaxed">
            Acompanhamento de autorizações e gestão de escolas da campanha
            <span className="font-semibold text-slate-600"> "Saúde em Movimento"</span>.
          </p>
        </div>

        {/* Lado direito: Usuário + Ações */}
        <div className="flex flex-col items-stretch sm:items-end gap-2.5 relative z-10">
          {currentUser && (
            <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white/80 border border-slate-200/80 rounded-xl text-xs shadow-sm w-full sm:w-auto backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="text-left min-w-0">
                <div className="font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                  <span className="truncate max-w-[180px] md:max-w-[280px] text-[13px]">{currentUser.name}</span>
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[8px] font-black rounded-md uppercase tracking-wider shrink-0 shadow-sm">
                    {currentUser.role === 'admin_master' ? 'Master' : 'Gestor'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono leading-tight mt-0.5 truncate">{currentUser.email}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowNewSchoolModal(true)}
              className="btn-primary-grad flex-1 sm:flex-none px-4 py-2 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Escola</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sair do Painel Gestor"
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-500 font-medium text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </div>
      </div>


      {/* ━━ TABS DE NAVEGAÇÃO PREMIUM ━━ */}
      <div className="flex gap-1 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl p-1 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('authorizations')}
          className={`px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'authorizations'
              ? 'bg-sesi-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>Autorizações</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
            activeTab === 'authorizations' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>{filteredAuths.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('schools')}
          className={`px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'schools'
              ? 'bg-sesi-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>Escolas &amp; Links</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
            activeTab === 'schools' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>{institutions.length}</span>
        </button>
      </div>

      {/* ABA 1: AUTORIZAÇÕES ASSINADAS */}
      {activeTab === 'authorizations' && (
        <div className="space-y-4">

          {/* ━━ FILTROS PREMIUM ━━ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-3">

            {/* Linha 1: Busca + Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">

              {/* Busca */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  id="admin-search-input"
                  name="adminSearchTerm"
                  type="text"
                  aria-label="Buscar aluno ou responsável"
                  placeholder="Buscar aluno, responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-input w-full pl-9 pr-3 py-2 text-xs text-slate-700 font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Status */}
              <div className="relative">
                <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select value={selectedStatus} onChange={(e) => handleStatusFilterChange(e.target.value as any)}
                  className="filter-input w-full pl-9 pr-7 py-2 text-xs text-slate-700 font-medium cursor-pointer appearance-none">
                  <option value="all">Status: Todos</option>
                  <option value="signed">✅ Autorizadas</option>
                  <option value="pending">⏳ Pendentes</option>
                  <option value="revoked">🚫 Negadas</option>
                  <option value="CANCELADO_POR_ERRO">⚠️ Canceladas</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
              </div>

              {/* Escola */}
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select value={selectedInstitution} onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="filter-input w-full pl-9 pr-7 py-2 text-xs text-slate-700 font-medium cursor-pointer appearance-none">
                  <option value="all">Todas as Escolas</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.short_name} - {inst.city}/{inst.state}</option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
              </div>

              {/* Série */}
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select value={selectedSeries} onChange={(e) => setSelectedSeries(e.target.value)}
                  className="filter-input w-full pl-9 pr-7 py-2 text-xs text-slate-700 font-medium cursor-pointer appearance-none">
                  <option value="all">Série: Todas</option>
                  <option value="1º Ano">1º Ano</option>
                  <option value="2º Ano">2º Ano</option>
                  <option value="3º Ano">3º Ano</option>
                  <option value="4º Ano">4º Ano</option>
                  <option value="9º Ano">9º Ano</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
              </div>

              {/* Período */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select value={selectedDateRange} onChange={(e) => setSelectedDateRange(e.target.value as any)}
                  className="filter-input w-full pl-9 pr-7 py-2 text-xs text-slate-700 font-medium cursor-pointer appearance-none">
                  <option value="all">Período: Todo</option>
                  <option value="today">📅 Hoje</option>
                  <option value="7days">📅 7 dias</option>
                  <option value="30days">📅 30 dias</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
              </div>

              {/* Imagem */}
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select value={selectedImageOption} onChange={(e) => setSelectedImageOption(e.target.value as any)}
                  className="filter-input w-full pl-9 pr-7 py-2 text-xs text-slate-700 font-medium cursor-pointer appearance-none">
                  <option value="all">Foto/Voz: Todas</option>
                  <option value="authorized">📸 Autorizada</option>
                  <option value="not_authorized">🚫 Não Autorizada</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
              </div>

            </div>

            {/* Linha 2: Stats + Exportação */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-2.5 w-full sm:w-auto">
                <div className="stat-card flex items-center gap-3 px-4 py-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center shadow-3xs">
                    <Users className="w-4 h-4 text-blue-600 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">{filteredAuths.length}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">Filtrados</div>
                  </div>
                </div>

                <div className="stat-card flex items-center gap-3 px-4 py-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center shadow-3xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {authorizations.filter(a => a.status === 'signed').length}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">Assinadas</div>
                  </div>
                </div>

                <div className="stat-card flex items-center gap-3 px-4 py-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50/80 border border-sky-100 flex items-center justify-center shadow-3xs">
                    <Camera className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">{totalImageAuthorized}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">c/ foto</div>
                  </div>
                </div>
              </div>

              {/* Botões de exportação */}
              <div className="flex items-center gap-2">
                <button onClick={handleExportCsv}
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:-translate-y-px">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exportar CSV</span>
                </button>

                <button onClick={handleExportZipPdfs} disabled={isExportingZip || filteredAuths.length === 0}
                  className="btn-primary-grad px-3.5 py-2 text-white font-bold text-xs rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  {isExportingZip ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Gerando...</span></>
                  ) : (
                    <><Archive className="w-3.5 h-3.5 text-blue-200" /><span>ZIP de PDFs</span></>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* ━━ SELETOR DE SUB-STATUS (SEGMENTED CONTROL) ━━ */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
            <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSubTabChange('active')}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  subTab === 'active'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ativas</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                  subTab === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>{activeCount}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubTabChange('cancelled')}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  subTab === 'cancelled'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Canceladas &amp; Negadas</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                  subTab === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                }`}>{cancelledCount}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubTabChange('all')}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  subTab === 'all'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Todas</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                  subTab === 'all' ? 'bg-slate-200 text-slate-700' : 'bg-slate-200 text-slate-600'
                }`}>{totalCount}</span>
              </button>
            </div>

            <div className="text-[11px] sm:text-xs text-slate-500 font-semibold px-2 text-center sm:text-right">
              Exibindo <span className="text-slate-800 font-bold">{filteredAuths.length}</span> de <span className="text-slate-800 font-bold">{authorizations.length}</span> registros totais
            </div>
          </div>

          {/* ━━ TABELA PREMIUM ━━ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col style={{width: '11%'}} />
                  <col style={{width: '16%'}} />
                  <col style={{width: '11%'}} />
                  <col style={{width: '15%'}} />
                  <col style={{width: '9%'}} />
                  <col style={{width: '10%'}} />
                  <col style={{width: '8%'}} />
                  <col style={{width: '20%'}} />
                </colgroup>
                <thead className="table-thead-premium">
                  <tr>
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Paciente / Aluno</th>
                    <th className="px-3 py-3">Turma / Turno</th>
                    <th className="px-3 py-3">Responsável Legal</th>
                    <th className="px-3 py-3">Escola</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Data</th>
                    <th className="px-3 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {filteredAuths.length > 0 ? (
                    filteredAuths.map((auth) => {
                      const isSigned = auth.status === 'signed';
                      const isCancelled = auth.status === 'CANCELADO_POR_ERRO' || auth.status === 'cancelled_error';
                      const isRevoked = auth.status === 'revoked';
                      const isPending = !isSigned && !isCancelled && !isRevoked;
                      const birthInfo = formatBirthDateAndAge(auth.birthDate);
                      const seriesClassText = formatStudentSeriesClass(auth.minorSeries, auth.minorClass);

                      return (
                        <tr 
                          key={auth.id} 
                          className={`table-row-premium border-b border-slate-100/80 last:border-0 ${isCancelled ? 'bg-amber-50/40' : ''}`}
                        >
                          {/* Col 1: Código */}
                          <td className="px-3 py-3 align-middle">
                            <span className="badge-code" title={auth.validationCode || auth.id}>
                              {auth.validationCode || auth.id}
                            </span>
                          </td>

                          {/* Col 2: Aluno + Nasc */}
                          <td className="px-2 py-3 align-middle">
                            <div className="font-bold text-slate-900 text-[11px] leading-tight truncate">{auth.studentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{auth.studentCpfMasked}</div>
                            {birthInfo && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                🎂 {birthInfo.formattedDate}{birthInfo.age ? ` · ${birthInfo.age}` : ''}
                              </div>
                            )}
                          </td>

                          {/* Col 3: Turma / Turno */}
                          <td className="px-2 py-3 align-middle">
                            {seriesClassText ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold">
                                  <GraduationCap className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span className="truncate">{seriesClassText}</span>
                                </span>
                                {auth.minorTurn && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                                    {auth.minorTurn}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">—</span>
                            )}
                          </td>

                          {/* Col 4: Responsável */}
                          <td className="px-2 py-3 align-middle">
                            <div className="font-bold text-slate-900 text-[11px] leading-tight truncate">{auth.parentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{auth.parentCpfMasked}</div>
                            <span className="text-[9px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200 font-semibold text-slate-500 uppercase">
                              {auth.relationship}
                            </span>
                          </td>

                          {/* Col 5: Escola */}
                          <td className="px-2 py-3 align-middle">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{auth.institutionName}</span>
                            </span>
                          </td>

                          {/* Col 6: Status + Atendimentos embutido */}
                          <td className="px-2 py-3 align-middle">
                            {isSigned && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  Autorizada
                                </span>
                                {auth.authImage ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold">
                                    <Camera className="w-2.5 h-2.5" /> Foto/Voz
                                  </span>
                                ) : null}
                              </div>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                                Cancelado
                              </span>
                            )}
                            {isRevoked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                Negada
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                Pendente
                              </span>
                            )}
                          </td>

                          {/* Col 7: Data */}
                          <td className="px-2 py-3 align-middle">
                            {auth.dateSent ? (() => {
                              const parts = auth.dateSent.split(', ');
                              return (
                                <div>
                                  <div className="text-[10px] text-slate-700 font-semibold">{parts[0]}</div>
                                  {parts[1] && <div className="text-[9px] text-slate-400 font-mono mt-0.5">{parts[1]}</div>}
                                </div>
                              );
                            })() : <span className="text-[10px] text-slate-400">—</span>}
                          </td>

                          {/* Col 8: Ações */}
                          <td className="px-2 py-3 align-middle">
                            {isCancelled ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => handleOpenDetailsModal(auth)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
                                  title="Ver Detalhes">
                                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Detalhes</span>
                                </button>
                                <button onClick={async () => { await apiClient.downloadDocumentCertificate(auth.id); }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                                  title="Baixar Certificado PDF">
                                  <FileCheck className="w-3.5 h-3.5 text-blue-700" />
                                  <span>PDF</span>
                                </button>
                                <button onClick={() => handleOpenResendEmailModal(auth)}
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-blue-55 hover:text-blue-700 hover:border-blue-200 text-slate-500 transition-all cursor-pointer active:scale-95"
                                  title="Reenviar E-mail de Cancelamento">
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : isSigned ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => handleOpenDetailsModal(auth)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sesi-primary hover:bg-blue-800 text-white text-[10px] font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
                                  title="Ver Ficha Completa">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Ficha</span>
                                </button>
                                <button onClick={() => handleOpenResendEmailModal(auth)}
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-500 transition-all cursor-pointer active:scale-95"
                                  title="Reenviar E-mail">
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleOpenRevokeModal(auth)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-[10px] font-semibold transition-all cursor-pointer active:scale-95"
                                  title="Revogar Autorização">
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Revogar</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => handleOpenDetailsModal(auth)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
                                  title="Ver Detalhes">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Ficha</span>
                                </button>
                                <button onClick={() => handleCopySchoolLink(auth.institutionId || 'cemeit')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-medium shadow-2xs transition-all cursor-pointer active:scale-95"
                                  title="Copiar Link para Pais">
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Link</span>
                                </button>
                                <button onClick={() => handleOpenRevokeModal(auth)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-[10px] font-semibold transition-all cursor-pointer active:scale-95"
                                  title="Revogar Autorização">
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Revogar</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="w-8 h-8 text-slate-300 mb-3" />
                          <h3 className="text-sm font-bold text-slate-700 mb-1">Nenhum registro encontrado</h3>
                          <p className="text-xs text-slate-500">Nenhum documento corresponde aos filtros selecionados.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: GESTÃO DE ESCOLAS & INSTITUIÇÕES */}
      {activeTab === 'schools' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 sm:p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-sesi-primary shrink-0 mt-0.5" />
            <div>
              <strong>Como funciona o roteamento por escola:</strong> Qualquer link no formato <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-blue-950 font-bold">/autorizar/[slug-da-escola]</code> carrega o termo de consentimento personalizado com o nome daquela instituição de ensino. Basta cadastrar a escola abaixo e copiar o link para enviar aos pais!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {institutions.map((inst) => {
              const isCopied = copiedSlug === inst.id;
              const directUrl = `${window.location.origin}/autorizar/${inst.id}`;

              return (
                <div 
                  key={inst.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                          /{inst.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {inst.city} - {inst.state}
                        </span>
                      </div>
                      {inst.id !== 'cemeit' && (
                        <button
                          onClick={() => handleDeactivateSchool(inst.id)}
                          className="text-slate-400 hover:text-amber-700 transition-colors px-2 py-1 rounded text-[11px] font-semibold hover:bg-amber-50 cursor-pointer"
                          title="Desativar rota desta escola"
                        >
                          <span>Desativar</span>
                        </button>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono break-all bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {directUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleCopySchoolLink(inst.id)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isCopied 
                          ? 'bg-emerald-600 text-white border border-emerald-700'
                          : 'bg-sesi-primary hover:bg-blue-800 text-white'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Link Copiado!' : 'Copiar Link dos Pais'}</span>
                    </button>

                    <button
                      onClick={() => onNavigateToSignerToken('projeto-escola-cidada-2026', inst.id)}
                      className="py-2.5 px-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      title="Abrir formulário desta escola"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Abrir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVA ESCOLA */}
      {showNewSchoolModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-sesi-primary flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base">Cadastrar Nova Escola</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">Crie um link exclusivo para uma instituição</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNewSchoolModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {schoolFormError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {schoolFormError}
              </div>
            )}

            <form onSubmit={handleCreateSchool} className="space-y-3.5">
              <div className="flex flex-col gap-1">
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
                  className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-sesi-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
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
                    className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-sesi-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
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
                    className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sesi-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="school-city" className="text-xs font-bold text-slate-700 uppercase">Cidade</label>
                  <input
                    id="school-city"
                    name="schoolCity"
                    type="text"
                    placeholder="Ex: Sobradinho"
                    value={newSchoolData.city}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, city: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-sesi-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="school-state" className="text-xs font-bold text-slate-700 uppercase">UF</label>
                  <input
                    id="school-state"
                    name="schoolState"
                    type="text"
                    maxLength={2}
                    placeholder="DF"
                    value={newSchoolData.state}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-sesi-primary"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSchoolModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-sesi-primary hover:bg-blue-800 text-white rounded-xl transition-colors shadow-xs cursor-pointer text-center"
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

      {/* MODAL DE CONFIRMAÇÃO DE SEGURANÇA: REVOGAÇÃO / ANULAÇÃO DE DOCUMENTO */}
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

      {/* MODAL: FICHA CADASTRAL E DE TRIAGEM CLÍNICA DO ESTUDANTE — FOLHA A4 SEM BORDAS (SESI SAÚDE) */}
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
                <div className="w-12 h-12 rounded-2xl bg-sesi-primary text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
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
                  className="px-3 py-2 rounded-xl bg-blue-50 text-sesi-primary hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
                    <UserCheck className="w-4 h-4 text-sesi-primary" />
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
                        Art. 16 LGPD & Art. 15 Marco Civil
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
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Data de Nascimento & Idade:</span>
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
              <div className="border border-emerald-200/60 bg-emerald-50/20 rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider">
                      Grade de Atendimentos Autorizados
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    SESI 5 em 1
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-100 text-[10px] font-bold text-slate-800 shadow-3xs">
                    <Eye className="w-3 h-3 text-emerald-600" />
                    <span>Oftalmologia</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-100 text-[10px] font-bold text-slate-800 shadow-3xs">
                    <Ear className="w-3 h-3 text-emerald-600" />
                    <span>Audiometria</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-100 text-[10px] font-bold text-slate-800 shadow-3xs">
                    <Smile className="w-3 h-3 text-emerald-600" />
                    <span>Odontologia</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-100 text-[10px] font-bold text-slate-800 shadow-3xs">
                    <Apple className="w-3 h-3 text-emerald-600" />
                    <span>Nutrição</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-100 text-[10px] font-bold text-slate-800 shadow-3xs">
                    <Brain className="w-3 h-3 text-emerald-600" />
                    <span>Psicologia</span>
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-3xs bg-white border ${
                    selectedAuthForDetails.authImage ? 'border-blue-100 text-slate-800' : 'border-slate-200 text-slate-400'
                  }`}>
                    <Camera className={`w-3 h-3 ${selectedAuthForDetails.authImage ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Uso de Imagem: {selectedAuthForDetails.authImage ? 'Autorizado ✓' : 'Não Autorizado ✕'}</span>
                  </span>
                </div>
              </div>

              {/* Bloco 4: Trilha de Auditoria e Hash Criptográfico */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Hash SHA-256 do Manifesto:</span>
                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[300px]">
                    {selectedAuthForDetails.hash}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[10px]">
                  <span>Assinatura Eletrônica Avançada (Lei nº 14.063/2020)</span>
                  <span>Data de Registro: {selectedAuthForDetails.dateSent}</span>
                </div>
              </div>

            </div>

            {/* Rodapé e Ações */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {selectedAuthForDetails.hash && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    onNavigateToValidatorHash(selectedAuthForDetails.hash);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-sesi-primary hover:bg-blue-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-blue-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
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
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-sesi-primary hover:bg-blue-800 text-white rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ficha A4</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: REENVIAR E-MAIL DE NOTIFICAÇÃO DE CANCELAMENTO */}
      {showResendEmailModal && selectedAuthForResendEmail && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowResendEmailModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Reenviar Notificação de Cancelamento
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Disparo de transparência e comprovante de invalidação (LGPD)
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
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-2">
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
            <div className="space-y-1.5">
              <label htmlFor="resend-email-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                E-mail do Responsável para Envio <span className="text-red-500">*</span>
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
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 placeholder:text-slate-400 disabled:bg-slate-100"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                O e-mail será despachado imediatamente com o layout formal timbrado do SESI e protocolo de invalidação.
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
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
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

