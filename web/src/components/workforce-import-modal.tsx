import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DownloadOutlined,
  FileTextOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Alert, Modal } from "antd";
import { isAxiosError } from "axios";
import { apiErrorMessage } from "../api/http";
import { importWorkforceUsers } from "../api/workforce-users.api";
import { WORKFORCE_USERS_QUERY_KEY } from "../hooks/query-keys";
import { useTranslation } from "../i18n/language";

interface ImportError {
  details?: { row: number; messages: string[] }[];
}

const example =
  "firstName,lastName,registrationNumber,phone\r\nAyşe,Yılmaz,CSV0001,5551234567\r\nCan,Kaya,CSV0002,\r\n";
const exampleUrl =
  "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + example);

export function WorkforceImportModal({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const client = useQueryClient();
  const [file, setFile] = useState<File>();
  const imported = useMutation({
    mutationFn: importWorkforceUsers,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [WORKFORCE_USERS_QUERY_KEY] });
    },
  });
  const details = isAxiosError<ImportError>(imported.error)
    ? imported.error.response?.data?.details
    : undefined;
  const tooLarge = Boolean(file && file.size > 256 * 1024);

  return (
    <Modal
      open
      className="workforce-import-modal"
      width={540}
      title={
        <span className="csv-import-title">
          <span className="csv-import-title-icon">
            <FileTextOutlined aria-hidden />
          </span>
          {t("CSV ile personel ekle")}
        </span>
      }
      okText={t(imported.isSuccess ? "Kapat" : "İçe aktar")}
      cancelText={t("Vazgeç")}
      confirmLoading={imported.isPending}
      okButtonProps={{ disabled: !imported.isSuccess && (!file || tooLarge) }}
      cancelButtonProps={{
        disabled: imported.isPending,
        hidden: imported.isSuccess,
      }}
      onCancel={() => {
        if (!imported.isPending) onClose();
      }}
      onOk={() => {
        if (imported.isSuccess) onClose();
        else if (file && !tooLarge && !imported.isPending)
          imported.mutate(file);
      }}
    >
      {imported.isSuccess ? (
        <Alert
          showIcon
          type="success"
          title={t("{count} personel eklendi.", {
            count: imported.data.imported,
          })}
        />
      ) : (
        <div className="csv-import-body">
          <section className="csv-import-picker">
            <div className="csv-import-file-icon">
              {file ? (
                <FileTextOutlined aria-hidden />
              ) : (
                <UploadOutlined aria-hidden />
              )}
            </div>
            <div className="csv-import-file-info">
              <strong className="csv-import-file-name" title={file?.name}>
                {file?.name ?? t("CSV dosyası")}
              </strong>
              <span id="csv-import-limit">
                {t("UTF-8 · En fazla 500 personel ve 256 KB")}
              </span>
            </div>
            <label className="csv-import-browse">
              <input
                type="file"
                accept=".csv,text/csv"
                aria-label={t("CSV dosyası")}
                aria-describedby="csv-import-limit"
                disabled={imported.isPending}
                onChange={(event) => {
                  imported.reset();
                  setFile(event.target.files?.[0]);
                }}
              />
              <span>{t(file ? "Dosyayı değiştir" : "Dosya seç")}</span>
            </label>
          </section>
          <a
            className="csv-import-example"
            href={exampleUrl}
            download="personel-ornek.csv"
          >
            <DownloadOutlined aria-hidden />
            {t("Örnek CSV indir")}
          </a>
          {tooLarge && (
            <Alert
              showIcon
              type="warning"
              title={t("Dosya 256 KB sınırını aşıyor.")}
            />
          )}
          {imported.isError && (
            <Alert
              showIcon
              type="error"
              title={apiErrorMessage(imported.error)}
              description={
                Array.isArray(details) && details.length ? (
                  <ul
                    style={{
                      maxHeight: 220,
                      overflowY: "auto",
                      paddingInlineStart: 20,
                    }}
                  >
                    {details.map(({ row, messages }) => (
                      <li key={row}>
                        {t("Satır {row}", { row })} · {messages.join(" ")}
                      </li>
                    ))}
                  </ul>
                ) : undefined
              }
            />
          )}
        </div>
      )}
    </Modal>
  );
}
