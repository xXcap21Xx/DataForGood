// Pantalla /revisiones/finalizadas: campañas finalizadas donde fuiste revisor.
// Solo monta CampaignList.tsx con completed = true.

import CampaignList from "../CampaignList";

export default function RevisionesFinalizadasPage() {
  return <CampaignList completed />;
}
