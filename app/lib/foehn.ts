// Föhn- und Bise-Bewertung aus Druckunterschieden (Schwellen = Erfahrungswerte, keine Flugfreigabe).
// Wird von der Hauptseite (FlugWetter) und der Föhn-/Bise-Analyse (FoehnBise) gemeinsam genutzt.

type Zahl = number | null;

const TEXT2 = "#5b7491";
const TEXT3 = "#8aa0b8";
const GRUEN = "#2e9e5b";
const GELB = "#e0a100";
const ORANGE = "#e07b00";
const ROT = "#d64545";

export type Status = { text: string; farbe: string; hinweis: string };

// Föhn-Index: Druck Lugano − Zürich. Positiv = Südföhn, negativ = Nordföhn.
// Schwellen (Erfahrungswerte): ab ca. 4 hPa greift Föhn in die Täler durch, ab ca. 8 hPa bis ins Flachland.
export function foehnStatus(d: Zahl): Status {
  if (d == null) return { text: "keine Daten", farbe: TEXT3, hinweis: "" };
  const a = Math.abs(d);
  const sued = d >= 0;
  const art = sued ? "Südföhn" : "Nordföhn";
  if (a < 2) return { text: "kein Föhn", farbe: GRUEN, hinweis: "Kein nennenswerter Druckunterschied über den Alpen." };
  if (a < 4) {
    return {
      text: `${art} möglich`,
      farbe: GELB,
      hinweis: sued
        ? "Leichter Südüberdruck – in exponierten Tälern kann es föhnig werden."
        : "Leichter Nordüberdruck – Nordwind über dem Alpenhauptkamm, Föhn höchstens auf der Alpensüdseite.",
    };
  }
  if (a < 8) {
    return {
      text: art,
      farbe: ORANGE,
      hinweis: sued
        ? "Südwind kann bis in die Täler der Alpennordseite durchgreifen (z. B. Haslital, Lauterbrunnental). Lee-Rotoren beachten."
        : "Nordföhn: Der Föhn weht auf der Alpensüdseite (Tessin). Im Berner Oberland liegt man auf der Luvseite – es kann Nord-/Nordwestwind und Stau geben, aber keinen Föhn.",
    };
  }
  return {
    text: `starker ${art}`,
    farbe: ROT,
    hinweis: sued
      ? "Starker Südüberdruck – Föhn kann bis ins Flachland durchgreifen."
      : "Starker Nordüberdruck – kräftiger Nordwind über den Alpen, auf der Alpensüdseite föhnig und stürmisch.",
  };
}

// Bise-Index: Druck Güttingen/TG minus Genf. Positiv = Bise (Erfahrungswerte, z. B. SRF Meteo).
export function biseStatus(d: Zahl): Status {
  if (d == null) return { text: "keine Daten", farbe: TEXT3, hinweis: "" };
  if (d < 0) return { text: "Südwestlage", farbe: TEXT2, hinweis: "Umgekehrter Gradient: im Mittelland eher Südwestwind, keine Bise." };
  if (d < 2) return { text: "keine Bise", farbe: GRUEN, hinweis: "Kaum Druckgefälle Richtung Westen." };
  if (d < 4) return { text: "Bise wahrscheinlich", farbe: GELB, hinweis: "Nordostwind im Mittelland wahrscheinlich, am stärksten Richtung Genfersee." };
  return { text: "Bisenlage", farbe: ORANGE, hinweis: "Je grösser der Unterschied, desto stärker die Bise (kräftige Böen am Genfersee möglich)." };
}

export function vorzeichen(d: number): string {
  return `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d).toFixed(1)}`;
}
