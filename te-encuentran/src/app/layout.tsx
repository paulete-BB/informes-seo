import type { Metadata } from "next";
import { Montserrat_Alternates, Roboto } from "next/font/google";
import "./globals.css";

const montserratAlternates = Montserrat_Alternates({
  variable: "--font-montserrat-alternates",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "¿Te encuentran? — Informe gratuito de visibilidad online",
  description:
    "Descubre cómo te ve Google y cómo te ve la IA cuando alguien busca tu negocio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${montserratAlternates.variable} ${roboto.variable} h-full antialiased print:h-auto`}
    >
      <body className="min-h-full flex flex-col print:min-h-0">
        <div className="barra-marca h-1.5 w-full" />
        {children}
      </body>
    </html>
  );
}
