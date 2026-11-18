import { DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { priorityOptions } from "./work-orders";
import type { WorkOrder, WorkOrderInput } from "./work-orders";

type Fields = Omit<WorkOrderInput, "dueAt"> & { dueAt: Dayjs };

export function OrderForm({
  order,
  pending,
  onSave,
  onClose,
}: {
  order?: WorkOrder;
  pending: boolean;
  onSave: (input: WorkOrderInput) => void;
  onClose: () => void;
}) {
  const [form] = Form.useForm<Fields>();
  return (
    <Modal
      open
      title={order ? "İş emrini düzenle" : "Yeni iş emri"}
      okText={order ? "Kaydet" : "Oluştur"}
      cancelText="Vazgeç"
      confirmLoading={pending}
      cancelButtonProps={{ disabled: pending }}
      onCancel={() => {
        if (!pending) onClose();
      }}
      onOk={() => form.submit()}
    >
      <Form<Fields>
        form={form}
        layout="vertical"
        initialValues={
          order
            ? { ...order, dueAt: dayjs(order.dueAt) }
            : { priority: "MEDIUM" }
        }
        onFinish={({ title, description, priority, dueAt }) =>
          onSave({
            title: title.trim(),
            description: description?.trim() || null,
            priority,
            dueAt: dueAt.toISOString(),
          })
        }
      >
        <Form.Item
          name="title"
          label="Başlık"
          rules={[
            { required: true, whitespace: true, message: "Başlık gir." },
            { max: 200 },
          ]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="description" label="Açıklama">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="priority" label="Öncelik" rules={[{ required: true }]}>
          <Select options={priorityOptions} />
        </Form.Item>
        <Form.Item
          name="dueAt"
          label="Bitiş zamanı"
          rules={[
            { required: true, message: "Bitiş zamanı seç." },
            {
              validator: (_, value: Dayjs | undefined) =>
                !value ||
                (order && value.valueOf() === dayjs(order.dueAt).valueOf()) ||
                value.isAfter(dayjs())
                  ? Promise.resolve()
                  : Promise.reject(new Error("Bitiş zamanı gelecekte olmalı.")),
            },
          ]}
        >
          <DatePicker
            showTime
            format="DD.MM.YYYY HH:mm"
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
