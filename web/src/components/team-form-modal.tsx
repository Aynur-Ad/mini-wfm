import { useTranslation } from "../i18n/language";
// web/src/components/team-form-modal.tsx
import { useEffect } from "react";
import { Form, Input, Modal, message } from "antd";
import { useCreateTeam, useUpdateTeam } from "../hooks/use-teams";
import type { CreateTeamDto, Team } from "../types";

interface TeamFormModalProps {
  open: boolean;
  team: Team | null;
  onClose: () => void;
}

export function TeamFormModal({ open, team, onClose }: TeamFormModalProps) {
  const t = useTranslation();
  const [form] = Form.useForm<CreateTeamDto>();
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();

  const isEditing = Boolean(team);
  const isSubmitting =
    createTeamMutation.isPending || updateTeamMutation.isPending;

  // Modal açıldığında: düzenleme modundaysa ekibin bilgilerini doldur, yeni ekipse formu sıfırla
  useEffect(() => {
    if (open) {
      if (team) {
        form.setFieldsValue({
          name: team.name,
          description: team.description ?? "",
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, team, form]);

  const handleSubmit = async () => {
    try {
      // 1. Önce Ant Design form doğrulamasını çalıştır (boşsa burada durur ve uyarı gösterir)
      const values = await form.validateFields();
      const payload: CreateTeamDto = {
        name: values.name.trim(),
        description: values.description?.trim() || (isEditing ? "" : undefined),
      };

      // 2. Moduna göre ilgili mutation'ı çağır
      if (isEditing && team) {
        await updateTeamMutation.mutateAsync({
          id: team.id,
          payload,
        });
        message.success(t("Ekip başarıyla güncellendi"));
      } else {
        await createTeamMutation.mutateAsync(payload);
        message.success(t("Ekip başarıyla oluşturuldu"));
      }

      // 3. Başarılıysa formu temizle ve modal'ı kapat (Hata olursa buraya geçmez, modal açık kalır)
      form.resetFields();
      onClose();
    } catch {
      // Form doğrulama hatası veya API hatası (API hatasını http.ts interceptor zaten kırmızı gösterir)
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={isEditing ? t("Ekibi Düzenle") : t("Yeni Ekip")}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={t("Kaydet")}
      cancelText={t("İptal")}
      confirmLoading={isSubmitting}
      mask={{ closable: !isSubmitting }}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        name="team_form"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          label={t("Ekip Adı")}
          name="name"
          rules={[
            {
              required: true,
              whitespace: true,
              message: t("Ekip adı boş bırakılamaz"),
            },
            {
              max: 200,
              message: t("Ekip adı en fazla 200 karakter olabilir"),
            },
          ]}
        >
          <Input
            placeholder={t("Örn: Backend Geliştirme Ekibi")}
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item label={t("Açıklama")} name="description">
          <Input.TextArea
            rows={4}
            placeholder={t("Ekibin görev tanımı ve açıklaması (opsiyonel)")}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
