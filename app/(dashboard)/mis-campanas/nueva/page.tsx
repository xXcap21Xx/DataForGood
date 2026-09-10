import { Suspense } from "react";
import NuevaCampanaForm from "./NuevaCampanaForm";

export default function NuevaCampanaPage() {
  return (
    <Suspense fallback={null}>
      <NuevaCampanaForm />
    </Suspense>
  );
}
