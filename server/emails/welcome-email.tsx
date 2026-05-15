import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import type {} from "react";
import React from "react";
void React;

interface WelcomeEmailProps {
  fullName: string;
  eventName: string;
  registrationDate: string;
  eventLocation: string;
  eventDescription: string;
}

export const WelcomeEmail = ({
  fullName = "Invitado",
  eventName = "Evento de Logistica",
  registrationDate = "Hoy",
  eventLocation = "Ciudad de Panama",
  eventDescription = "Gracias por visitarnos en nuestro stand.",
}: WelcomeEmailProps) => {
  const previewText = `${fullName}, gracias por visitarnos en ${eventName} - Premium Rush Cargo`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-sky-50 font-sans m-auto">
          <Container className="mx-auto p-5 max-w-[520px]">

            {/* Header */}
            <Section className="bg-sky-500 rounded-t-xl px-5 py-6 text-center">
              <Text className="text-white text-2xl font-bold m-0">
                Premium Rush Cargo
              </Text>
              <Text className="text-sky-100 text-sm m-0 mt-1">
                Soluciones Logisticas de Clase Mundial
              </Text>
            </Section>

            {/* Hero Text */}
            <Section className="bg-white px-5 py-8 text-center">
              <Heading className="text-slate-900 text-xl font-bold m-0 mb-2">
                ¡Gracias por visitarnos, {fullName}!
              </Heading>
              <Text className="text-slate-500 text-base m-0">
                Fue un placer conocerte en nuestro stand
              </Text>
            </Section>

            {/* Event Info */}
            <Section className="bg-white px-5 pb-6 text-center">
              <Text className="bg-sky-100 text-sky-600 text-xs font-bold tracking-wider py-1 px-3 rounded-full inline-block m-0 mb-3">
                NOS CONOCIMOS EN
              </Text>
              <Heading className="text-slate-900 text-lg font-semibold m-0 mb-5">
                {eventName}
              </Heading>

              <Section className="bg-sky-50 rounded-lg p-4 text-left">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="w-9 text-lg align-top pb-3">📅</td>
                      <td className="align-top pb-3">
                        <Text className="text-slate-500 text-xs uppercase tracking-wide m-0">
                          Te registraste el
                        </Text>
                        <Text className="text-slate-900 text-sm font-semibold m-0 mt-0.5">
                          {registrationDate}
                        </Text>
                      </td>
                    </tr>
                    <tr>
                      <td className="w-9 text-lg align-top">📍</td>
                      <td className="align-top">
                        <Text className="text-slate-500 text-xs uppercase tracking-wide m-0">
                          Ubicacion del evento
                        </Text>
                        <Text className="text-slate-900 text-sm font-semibold m-0 mt-0.5">
                          {eventLocation}
                        </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>

              <Hr className="border-slate-200 my-5" />
              <Text className="text-slate-600 text-sm leading-relaxed m-0">
                {eventDescription}
              </Text>
            </Section>

            {/* Next Steps */}
            <Section className="bg-white px-5 pb-6">
              <Heading className="text-slate-900 text-lg font-semibold text-center m-0 mb-4">
                📋 Proximos pasos
              </Heading>
              <Text className="text-slate-600 text-sm leading-relaxed text-center m-0">
                Hemos guardado tu informacion de contacto. En los proximos dias,
                uno de nuestros asesores se comunicara contigo para conversar sobre
                como nuestros servicios de logistica pueden ayudar a tu empresa.
              </Text>
            </Section>

            {/* Services */}
            <Section className="bg-white px-5 pb-6">
              <Heading className="text-slate-900 text-lg font-semibold text-center m-0 mb-5">
                🚀 Nuestros Servicios
              </Heading>

              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-11 align-top pb-4">
                      <Text className="bg-sky-100 rounded-md text-lg p-1.5 m-0 text-center inline-block">
                        ✈️
                      </Text>
                    </td>
                    <td className="align-top pb-4">
                      <Text className="text-slate-900 text-sm font-semibold m-0">
                        Carga Aerea Internacional
                      </Text>
                      <Text className="text-slate-500 text-xs leading-relaxed m-0">
                        Envios rapidos y seguros a cualquier parte del mundo.
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-11 align-top pb-4">
                      <Text className="bg-sky-100 rounded-md text-lg p-1.5 m-0 text-center inline-block">
                        🚢
                      </Text>
                    </td>
                    <td className="align-top pb-4">
                      <Text className="text-slate-900 text-sm font-semibold m-0">
                        Carga Maritima
                      </Text>
                      <Text className="text-slate-500 text-xs leading-relaxed m-0">
                        Contenedores FCL y LCL a precios competitivos.
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-11 align-top pb-4">
                      <Text className="bg-sky-100 rounded-md text-lg p-1.5 m-0 text-center inline-block">
                        🛃
                      </Text>
                    </td>
                    <td className="align-top pb-4">
                      <Text className="text-slate-900 text-sm font-semibold m-0">
                        Aduanas y Documentacion
                      </Text>
                      <Text className="text-slate-500 text-xs leading-relaxed m-0">
                        Gestion completa de tramites aduanales.
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-11 align-top">
                      <Text className="bg-sky-100 rounded-md text-lg p-1.5 m-0 text-center inline-block">
                        🏭
                      </Text>
                    </td>
                    <td className="align-top">
                      <Text className="text-slate-900 text-sm font-semibold m-0">
                        Almacenaje y Distribucion
                      </Text>
                      <Text className="text-slate-500 text-xs leading-relaxed m-0">
                        Bodegas estrategicas y entregas last-mile.
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* CTA - Email */}
            <Section className="bg-white px-5 pb-4 text-center">
              <Text className="text-slate-500 text-sm m-0 mb-3">
                ¿Necesitas una cotizacion urgente?
              </Text>
              <Button
                className="bg-orange-500 text-white text-sm font-semibold py-3 px-6 rounded-md no-underline"
                href="mailto:coo@prscargo.us?subject=Consulta%20desde%20evento"
              >
                ✉️ Escribenos por Email
              </Button>
            </Section>

            {/* CTA - WhatsApp */}
            <Section className="bg-white px-5 pb-6 text-center">
              <Text className="text-slate-500 text-sm m-0 mb-3">
                ¿Prefieres WhatsApp? ¡Tambien estamos ahi!
              </Text>
              <Button
                className="bg-green-500 text-white text-sm font-semibold py-3 px-6 rounded-md no-underline"
                href="https://wa.me/50764225150?text=Hola%2C%20los%20conoci%20en%20el%20evento%20y%20me%20gustaria%20mas%20informacion"
              >
                💬 Escribenos por WhatsApp
              </Button>
            </Section>

            {/* Reminder */}
            <Section className="bg-amber-100 rounded-lg mb-5 p-4">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-8 text-xl align-top">📞</td>
                    <td className="align-top">
                      <Text className="text-amber-800 text-sm font-semibold m-0">
                        Te contactaremos pronto
                      </Text>
                      <Text className="text-amber-700 text-xs leading-relaxed m-0">
                        Un asesor se comunicara contigo en los proximos dias habiles.
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Footer */}
            <Section className="bg-slate-900 rounded-b-xl px-5 py-6 text-center">
              <Text className="text-white text-lg font-bold m-0">
                📦 Premium Rush Cargo
              </Text>
              <Text className="text-slate-400 text-xs m-0 mt-1 mb-4">
                Tu socio logistico de confianza 🌎
              </Text>

              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="text-center pb-2">
                      <Link
                        href="mailto:coo@prscargo.us"
                        className="text-sky-400 text-sm no-underline"
                      >
                        ✉️ coo@prscargo.us
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-center">
                      <Link
                        href="https://wa.me/50764225150"
                        className="text-green-400 text-sm no-underline"
                      >
                        💬 +507 6422-5150
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>

              <Text className="text-slate-500 text-xs m-0 mt-4">
                Premium Rush Cargo | Ciudad de Panama, Panama
              </Text>
              <Text className="text-slate-500 text-xs m-0 mt-1">
                © {new Date().getFullYear()} Premium Rush Cargo. Todos los derechos reservados.
              </Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export async function renderWelcomeEmail(props: WelcomeEmailProps): Promise<string> {
  return await render(<WelcomeEmail {...props} />);
}

export default WelcomeEmail;
