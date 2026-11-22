// "Nahlásit problém": the report form on tomandes.eu. No GitHub account needed - it files the report as an
// issue in this repository. zus=1 marks the reporter as a pupil (the form is simpler then);
// embed=1 is the form alone, for showing it in a window inside the app (ReportFormModal).
export function reportFormUrl(options: { pupil?: boolean; embed?: boolean } = {}): string {
  return `https://tomandes.eu/report/?app=keyboard-hero&lang=cs${options.pupil ? '&zus=1' : ''}${options.embed ? '&embed=1' : ''}`
}
