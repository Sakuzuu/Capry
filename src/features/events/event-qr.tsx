"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";

export function EventQr({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then((qr) => qr.toDataURL(new URL(`/evento/${id}`, window.location.origin).href, {
      width: 768, margin: 4, errorCorrectionLevel: "M", color: { dark: "#20142fff", light: "#ffffffff" },
    })).then((url) => { if (!cancelled) setImage(url); }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [id]);
  return <Modal titleId="qr-title" className="qr-modal" onClose={onClose}>
    <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar código QR">×</button>
    <p className="eyebrow">UNA FIESTA, UN ENLACE</p>
    <h2 id="qr-title">Lleva la noche contigo.</h2>
    <p>Escanea el código para abrir la ficha de {name}.</p>
    {image ? <>
      {/* A local data URL keeps QR generation private and available without a third-party service. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="event-qr-image" src={image} alt={`Código QR del enlace de ${name}`} width={256} height={256} />
      <a className="publish-primary qr-download" href={image} download={`capry-${id}.png`}>Descargar QR <Icon name="arrow-down" /></a>
    </> : <p role="status">{error ? "No se pudo generar el QR. Cierra y vuelve a intentarlo." : "Preparando tu código…"}</p>}
  </Modal>;
}
