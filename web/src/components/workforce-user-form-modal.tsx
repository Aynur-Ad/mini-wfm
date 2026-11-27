import { useTranslation } from "../i18n/language";
import { useEffect, useRef } from "react";
import { Form, Input, Modal, message } from "antd";
import {
  useCreateWorkforceUser,
  useUpdateWorkforceUser,
} from "../hooks/use-workforce-users";
import type { CreateWorkforceUserDto, WorkforceUser } from "../types";

interface FormValues {
  firstName: string;
  lastName: string;
  registrationNumber: string;
  phone?: string;
}

interface WorkforceUserFormModalProps {
  open: boolean;
  person: WorkforceUser | null;
  onClose: () => void;
  onSaved?: () => void;
}

const trimText = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

export function WorkforceUserFormModal({
  open,
  person,
  onClose,
  onSaved,
}: WorkforceUserFormModalProps) {
  const t = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const createMutation = useCreateWorkforceUser();
  const updateMutation = useUpdateWorkforceUser();
  const submitting = useRef(false);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (person) {
      form.setFieldsValue({
        firstName: person.firstName,
        lastName: person.lastName,
        registrationNumber: person.registrationNumber,
        phone: person.phone ?? "",
      });
    }
  }, [open, person, form]);

  const handleSubmit = async (values: FormValues) => {
    if (submitting.current) return;
    submitting.current = true;
    const payload: CreateWorkforceUserDto = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      registrationNumber: values.registrationNumber.trim(),
      // Boş telefon undefined olursa PATCH eski telefonu korur; null ile temizlenir.
      phone: values.phone?.trim() || null,
    };
    try {
      if (person) {
        await updateMutation.mutateAsync({ id: person.id, payload });
        void messageApi.success(t("Personel başarıyla güncellendi"));
      } else {
        await createMutation.mutateAsync(payload);
        void messageApi.success(t("Personel başarıyla oluşturuldu"));
      }
      form.resetFields();
      onSaved?.();
      onClose();
    } catch {
      // API hatası ortak http istemcisinden gösterilir; form açık ve değerler korunur.
    } finally {
      submitting.current = false;
    }
  };

  const handleClose = () => {
    if (submitting.current) return;
    form.resetFields();
    onClose();
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={person ? t("Personeli Düzenle") : t("Yeni Personel")}
        open={open}
        onOk={() => form.submit()}
        onCancel={handleClose}
        okText={t("Kaydet")}
        cancelText={t("İptal")}
        confirmLoading={isSubmitting}
        cancelButtonProps={{ disabled: isSubmitting }}
        closable={!isSubmitting}
        keyboard={!isSubmitting}
        mask={{ closable: !isSubmitting }}
        destroyOnHidden
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          name="workforce_user_form"
          disabled={isSubmitting}
          onFinish={(values) => {
            void handleSubmit(values);
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t("Ad")}
            name="firstName"
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("Ad boş bırakılamaz"),
              },
              {
                max: 100,
                transform: trimText,
                message: t("Ad en fazla 100 karakter olabilir"),
              },
            ]}
          >
            <Input
              autoFocus
              autoComplete="given-name"
              maxLength={100}
              showCount
            />
          </Form.Item>
          <Form.Item
            label={t("Soyad")}
            name="lastName"
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("Soyad boş bırakılamaz"),
              },
              {
                max: 100,
                transform: trimText,
                message: t("Soyad en fazla 100 karakter olabilir"),
              },
            ]}
          >
            <Input autoComplete="family-name" maxLength={100} showCount />
          </Form.Item>
          <Form.Item
            label={t("Sicil No")}
            name="registrationNumber"
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("Sicil numarası boş bırakılamaz"),
              },
              {
                max: 20,
                transform: trimText,
                message: t("Sicil numarası en fazla 20 karakter olabilir"),
              },
            ]}
          >
            <Input maxLength={20} showCount autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={t("Telefon")}
            name="phone"
            extra={t(
              "İsteğe bağlı. Başında 0 olmadan, 5 ile başlayan 10 rakam girin.",
            )}
            rules={[
              {
                pattern: /^5[0-9]{9}$/,
                message: t("Telefon 10 rakam olmalı ve 5 ile başlamalıdır"),
              },
            ]}
          >
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="5321234567"
              maxLength={10}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
