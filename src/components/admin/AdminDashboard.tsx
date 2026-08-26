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
  Sparkles,
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
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showNewSchoolModal, setShowNewSchoolModal] = useState(false);

  // Estados do Modal de Ficha Completa do Aluno (Triagem SESI Saúde)
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAuthForDetails, setSelectedAuthForDetails] = useState<any | null>(null);

  // Estados do Modal de Revogação / Cancelamento por Erro
  const [showRevocationModal, setShowRevocationModal] = useState(false);
  const [selectedAuthToRevoke, setSelectedAuthToRevoke] = useState<any | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [revocationConfirmed, setRevocationConfirmed] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revocationError, setRevocationError] = useState('');
  const [revocationSuccessToast, setRevocationSuccessToast] = useState<string | null>(null);
  const [isFetchingEmail, setIsFetchingEmail] = useState(false);
  const [emailAutoFilled, setEmailAutoFilled] = useState(false);

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
            dateSent: doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : 'Hoje',
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

  const handleOpenRevokeModal = async (auth: any) => {
    setSelectedAuthToRevoke(auth);
    setRevocationReason('');
    setNotifyEmail('');
    setRevocationConfirmed(false);
    setRevocationError('');
    setEmailAutoFilled(false);
    setShowRevocationModal(true);

    // Busca automática do e-mail do responsável via descriptografia segura no backend
    if (auth.id) {
      setIsFetchingEmail(true);
      try {
        const result = await apiClient.getDocumentParentEmail(auth.id);
        if (result.success && result.parent_email) {
          setNotifyEmail(result.parent_email);
          setEmailAutoFilled(true);
        }
      } catch {
        // Falha silenciosa — admin pode preencher manualmente
      } finally {
        setIsFetchingEmail(false);
      }
    }
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
        revocationReason.trim(), 
        notifyEmail.trim() || undefined
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

    const matchesStatus =
      selectedStatus === 'all' ||
      auth.status === selectedStatus ||
      (selectedStatus === 'CANCELADO_POR_ERRO' && (auth.status === 'CANCELADO_POR_ERRO' || auth.status === 'cancelled_error'));

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
    <div className="p-2 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Corporativo */}
      <div className="bg-white border border-slate-200 p-4 sm:p-6 lg:p-8 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold tracking-widest uppercase mb-2 sm:mb-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
            </span>
            PLATAFORMA CATRAKI ATIVA
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Painel Gestor
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm max-w-xl leading-relaxed">
            Acompanhamento de autorizações e gestão de escolas participantes da campanha "Saúde em Movimento".
          </p>
        </div>
        
        <div className="flex flex-col items-stretch sm:items-end gap-2.5 relative z-10">
          {/* Card do Usuário Logado */}
          {currentUser && (
            <div className="flex items-center gap-3 px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs shadow-xs w-full sm:w-auto">
              <div className="w-8 h-8 rounded-lg bg-sesi-primary text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left min-w-0">
                <div className="font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                  <span className="truncate max-w-[200px] md:max-w-[320px]">{currentUser.name}</span>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-sesi-primary text-[9px] font-bold rounded-full uppercase tracking-wider shrink-0">
                    {currentUser.role === 'admin_master' ? 'Master' : 'Gestor'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono leading-tight mt-0.5 truncate">{currentUser.email}</div>
              </div>
            </div>
          )}

          {/* Botões de Ação Abaixo do Card do Usuário */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={() => setShowNewSchoolModal(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Escola</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sair do Painel Gestor"
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navegação entre Abas (Scrollável no Mobile) */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('authorizations')}
          className={`pb-3 px-2 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'authorizations'
              ? 'border-sesi-primary text-sesi-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Autorizações ({filteredAuths.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schools')}
          className={`pb-3 px-2 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'schools'
              ? 'border-sesi-primary text-sesi-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Escolas & Links ({institutions.length})</span>
        </button>
      </div>

      {/* ABA 1: AUTORIZAÇÕES ASSINADAS */}
      {activeTab === 'authorizations' && (
        <div className="space-y-4">


          {/* Caixa de Pesquisa e Filtros Avançados */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
            
            {/* Linha 1: Barra de Busca + Dropdowns de Filtro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              
              {/* Input de Busca */}
              <div className="relative group sm:col-span-2 lg:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="admin-search-input"
                  name="adminSearchTerm"
                  type="text"
                  aria-label="Buscar aluno ou responsável"
                  placeholder="Buscar aluno, responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all"
                />
              </div>

              {/* Filtro: Status */}
              <div className="relative">
                <FileCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="admin-filter-status"
                  name="filterStatus"
                  aria-label="Filtrar por status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none truncate"
                >
                  <option value="all">Status: Todos</option>
                  <option value="signed">✅ Autorizadas (Assinadas)</option>
                  <option value="pending">⏳ Pendentes</option>
                  <option value="revoked">🚫 Negadas pelo Responsável</option>
                  <option value="CANCELADO_POR_ERRO">⚠️ Canceladas por Erro (Invalidadas)</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Filtro: Escola */}
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none truncate"
                >
                  <option value="all">Todas as Escolas</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.short_name} - {inst.city}/{inst.state}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>


              {/* Filtro: Série / Ano */}
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedSeries}
                  onChange={(e) => setSelectedSeries(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none truncate"
                >
                  <option value="all">Série/Ano: Todos</option>
                  <option value="1º Ano">1º Ano</option>
                  <option value="2º Ano">2º Ano</option>
                  <option value="3º Ano">3º Ano</option>
                  <option value="4º Ano">4º Ano</option>
                  <option value="9º Ano">9º Ano</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Filtro: Uso de Imagem */}
              <div className="relative">
                <Camera className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedImageOption}
                  onChange={(e) => setSelectedImageOption(e.target.value as any)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none truncate"
                >
                  <option value="all">Imagem: Todas</option>
                  <option value="authorized">📸 Autorizada</option>
                  <option value="not_authorized">🚫 Não Autorizada</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Filtro: Período */}
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value as any)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none truncate"
                >
                  <option value="all">Período: Todo</option>
                  <option value="today">📅 Assinadas Hoje</option>
                  <option value="7days">📅 Últimos 7 dias</option>
                  <option value="30days">📅 Últimos 30 dias</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

            </div>

            {/* Linha 2: Resumo Métrico + Botões de Exportação Consolidada */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Badges de Contagem */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-sesi-primary font-bold rounded-lg border border-blue-100">
                  <Users className="w-3.5 h-3.5" />
                  <span>{filteredAuths.length} registros</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-100">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{totalImageAuthorized} com imagem autorizada</span>
                </span>
              </div>

              {/* Botões de Ação: Excel / CSV e ZIP de PDFs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  title="Exportar dados consolidados em planilha Excel/CSV"
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  onClick={handleExportZipPdfs}
                  disabled={isExportingZip || filteredAuths.length === 0}
                  title="Baixar todos os termos assinados filtrados em um arquivo ZIP"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isExportingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Gerando ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 text-blue-300" />
                      <span>Baixar ZIP de PDFs</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

          {/* Tabela de Autorizações com Rolagem Horizontal Suave */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[1280px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4">Código</th>
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4">Paciente / Aluno</th>
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4">Ano / Turma</th>
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4">Responsável Legal</th>
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4">Instituição / Escola</th>
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4">Atendimentos</th>
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4">Status</th>
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4">Data</th>
                    <th className="px-3.5 sm:px-4 py-3.5 sm:py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
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
                          className={`hover:bg-slate-50/70 transition-colors ${isCancelled ? 'bg-amber-50/30' : ''}`}
                        >
                          {/* Coluna 1: Código de Validação */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                              {auth.validationCode || auth.id}
                            </span>
                          </td>

                          {/* Coluna 2: Paciente / Aluno + Data Nasc/Idade */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4">
                            <div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">{auth.studentName}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-slate-500 font-mono">{auth.studentCpfMasked}</span>
                                {birthInfo && (
                                  <span className="text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200" title="Data de Nascimento">
                                    🎂 {birthInfo.formattedDate} {birthInfo.age ? `(${birthInfo.age})` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Coluna 3: Ano / Série, Turma e Turno (Destaque SESI) */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4">
                            {seriesClassText ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold w-fit shadow-xs">
                                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{seriesClassText}</span>
                                </span>
                                {auth.minorTurn && (
                                  <span className="text-[10px] text-slate-500 font-medium capitalize pl-0.5">
                                    Turno: <strong className="text-slate-700">{auth.minorTurn}</strong>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Não informado</span>
                            )}
                          </td>

                          {/* Coluna 4: Responsável Legal + Vínculo */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4">
                            <div className="text-xs text-slate-700 font-medium">
                              <span className="font-bold text-slate-900">{auth.parentName}</span>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                <span>{auth.parentCpfMasked}</span>
                                <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-semibold text-slate-600 uppercase border border-slate-200">
                                  {auth.relationship}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Coluna 5: Instituição / Escola */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[140px]">{auth.institutionName}</span>
                            </span>
                          </td>

                          {/* Coluna 6: Atendimentos & Imagem */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4">
                            {isSigned ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold w-fit" title="Oftalmologia, Audiometria, Odontologia, Psicologia e Nutrição">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  <span>Saúde 5 em 1</span>
                                </span>
                                {auth.authImage ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold w-fit" title="Uso de Imagem e Voz Autorizado">
                                    <Camera className="w-3 h-3 text-blue-600" />
                                    <span>Foto/Voz Sim</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold w-fit" title="Uso de Imagem e Voz Recusado">
                                    <span>Sem Foto</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>

                          {/* Coluna 7: Status */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4">
                            {isSigned && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Autorizada</span>
                              </span>
                            )}
                            {isCancelled && (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold shadow-2xs whitespace-nowrap" 
                                title="Autorização invalidada administrativamente com preservação de custódia pericial (soft delete)"
                              >
                                <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>Cancelado</span>
                              </span>
                            )}
                            {isRevoked && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>Negada</span>
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold whitespace-nowrap">
                                <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>Pendente</span>
                              </span>
                            )}
                          </td>

                          {/* Coluna 8: Data */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4">
                            <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                              {auth.dateSent}
                            </span>
                          </td>

                          {/* Coluna 9: Ações (Bloqueio Visual para Cancelados — Modo Somente Leitura) */}
                          <td className="px-3.5 sm:px-4 py-3.5 sm:py-4 text-right whitespace-nowrap">
                            {isCancelled ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenDetailsModal(auth)}
                                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
                                  title="Ver Detalhes do Cancelamento e Ficha do Estudante"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-500" /> 
                                  <span>Ver Detalhes</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    await apiClient.downloadDocumentCertificate(auth.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  title="Baixar Certificado de Conclusão / Timeline (PDF)"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-blue-700" />
                                  <span>Certificado</span>
                                </button>
                                <button
                                  onClick={() => handleOpenResendEmailModal(auth)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-all cursor-pointer shadow-2xs"
                                  title="Reenviar Notificação de Cancelamento por E-mail ao Responsável"
                                >
                                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                                </button>
                              </div>
                            ) : isSigned ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenDetailsModal(auth)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sesi-primary hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                                  title="Abrir Ficha Completa de Triagem do Estudante (SESI Saúde)"
                                >
                                  <FileText className="w-3.5 h-3.5 text-white" /> 
                                  <span>Ver Ficha</span>
                                </button>
                                <button
                                  onClick={() => handleOpenResendEmailModal(auth)}
                                  className="inline-flex items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shadow-2xs"
                                  title="Reenviar Comprovante de Assinatura por E-mail ao Responsável"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenRevokeModal(auth)}
                                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                                  title="Revogar autorização e desativar links de acesso por inconsistência ou solicitação"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Revogar</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenDetailsModal(auth)}
                                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-xs transition-all cursor-pointer"
                                  title="Ver dados cadastrais"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-500" /> 
                                  <span>Ver Ficha</span>
                                </button>
                                <button
                                  onClick={() => handleCopySchoolLink(auth.institutionId || 'cemeit')}
                                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium shadow-xs transition-all cursor-pointer"
                                  title="Copiar link de assinatura para os pais"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Link</span>
                                </button>
                                <button
                                  onClick={() => handleOpenRevokeModal(auth)}
                                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                                  title="Revogar documento pendente e inutilizar link de acesso"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Revogar Documento</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 sm:py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="w-8 h-8 text-slate-300 mb-3" />
                          <h3 className="text-sm font-bold text-slate-700 mb-1">Nenhum registro encontrado</h3>
                          <p className="text-xs text-slate-500">
                            Nenhum documento corresponde aos filtros selecionados.
                          </p>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => !isRevoking && setShowRevocationModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com Título Claro e Alerta de Segurança */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Tem certeza de que deseja anular este documento?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Revogação administrativa de autorização por inconsistência cadastral ou operacional
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isRevoking && setShowRevocationModal(false)}
                disabled={isRevoking}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Item / Documento Alvo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Documento & Protocolo:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {selectedAuthToRevoke.validationCode || selectedAuthToRevoke.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tipo de Documento:</span>
                  <span className="font-bold text-slate-800 truncate block">Termo de Consentimento — SESI Saúde / Escola Cidadã</span>
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

            {/* Aviso de Impacto (Tom amigável e transparente) */}
            <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-4 text-xs text-rose-950 leading-relaxed space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <Info className="w-4 h-4 text-rose-700 shrink-0" />
                <span>Aviso de Impacto do Cancelamento:</span>
              </div>
              <p className="text-[12px] text-rose-900 font-medium leading-relaxed">
                Esta ação é permanente. Os links de assinatura serão desativados agora mesmo e todos os envolvidos receberão um e-mail avisando sobre o cancelamento.
              </p>
            </div>

            {/* Formulário: Justificativa Obrigatória */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="revocation-reason" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Por favor, explique o motivo do cancelamento <span className="text-slate-400 font-normal lowercase">(registro obrigatório para segurança e auditoria)</span> <span className="text-red-500">*</span>
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
                placeholder="Descreva o motivo da anulação/revogação (ex: erro de digitação do CPF na matrícula ou solicitação do responsável)..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400 leading-relaxed resize-none disabled:bg-slate-100"
              />
            </div>

            {/* Campo: E-mail de Notificação Instantânea ao Responsável */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="notify-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  E-mail para Notificação do Responsável <span className="text-slate-400 font-normal lowercase">(disparo imediato)</span>
                </label>
                {isFetchingEmail && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold shrink-0">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Buscando...
                  </span>
                )}
                {emailAutoFilled && !isFetchingEmail && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-detectado
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="notify-email"
                  type="email"
                  value={notifyEmail}
                  disabled={isRevoking || isFetchingEmail}
                  onChange={(e) => { setNotifyEmail(e.target.value); setEmailAutoFilled(false); }}
                  placeholder={isFetchingEmail ? 'Buscando e-mail do responsável...' : 'exemplo: pai.responsavel@gmail.com...'}
                  className={`w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400 disabled:bg-slate-100 transition-all ${
                    emailAutoFilled
                      ? 'border-emerald-400 bg-emerald-50/50 text-emerald-800 font-medium'
                      : 'border-slate-300'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {emailAutoFilled
                  ? 'E-mail recuperado automaticamente do cadastro do documento. Edite se necessário.'
                  : 'O responsável receberá o comprovante formal de cancelamento com protocolo e data/hora.'
                }
              </p>
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
            <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
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
          </div>
        </div>
      )}

      {/* MODAL: FICHA CADASTRAL E DE TRIAGEM CLÍNICA DO ESTUDANTE — FOLHA A4 SEM BORDAS (SESI SAÚDE) */}
      {showDetailsModal && selectedAuthForDetails && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
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
                      Ficha do Estudante &bull; SESI Saúde
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
              <div className="border border-emerald-200/90 bg-emerald-50/40 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Grade de Atendimentos de Saúde (SESI 5 em 1)
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    100% Gratuito
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Oftalmologia</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Acuidade Visual &bull; Autorizado ✓</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-2">
                    <Ear className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Audiometria</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Triagem Auditiva &bull; Autorizado ✓</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-2">
                    <Smile className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Odontologia</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Saúde Bucal &bull; Autorizado ✓</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-2">
                    <Apple className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Nutrição</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Antropometria &bull; Autorizado ✓</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Psicologia</strong>
                      <span className="text-[10px] text-emerald-700 font-semibold">Acolhimento &bull; Autorizado ✓</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Uso de Imagem</strong>
                      <span className={`text-[10px] font-bold ${selectedAuthForDetails.authImage ? 'text-blue-700' : 'text-slate-500'}`}>
                        {selectedAuthForDetails.authImage ? 'Autorizado ✓' : 'Não Autorizado ✕'}
                      </span>
                    </div>
                  </div>
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200"
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

