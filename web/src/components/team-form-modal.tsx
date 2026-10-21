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
        description: values.description?.trim() || undefined,
      };

      // 2. Moduna göre ilgili mutation'ı çağır
      if (isEditing && team) {
        await updateTeamMutation.mutateAsync({
          id: team.id,
          payload,
        });
        message.success("Ekip başarıyla güncellendi");
      } else {
        await createTeamMutation.mutateAsync(payload);
        message.success("Ekip başarıyla oluşturuldu");
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
      title={isEditing ? "Ekibi Düzenle" : "Yeni Ekip"}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Kaydet"
      cancelText="İptal"
      confirmLoading={isSubmitting}
      maskClosable={!isSubmitting}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        name="team_form"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          label="Ekip Adı"
          name="name"
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Ekip adı boş bırakılamaz",
            },
            {
              max: 200,
              message: "Ekip adı en fazla 200 karakter olabilir",
            },
          ]}
        >
          <Input
            placeholder="Örn: Backend Geliştirme Ekibi"
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item label="Açıklama" name="description">
          <Input.TextArea
            rows={4}
            placeholder="Ekibin görev tanımı ve açıklaması (opsiyonel)"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
