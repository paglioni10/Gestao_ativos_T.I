// Ordena tipos de equipamento em ordem alfabética (pt-BR, sem diferenciar
// acento/maiúscula), mas mantendo "Outro"/"Outra" sempre por último — é a
// opção "coringa" e faz sentido ficar no fim de qualquer lista.
export function sortEquipmentTypes<T extends { name: string }>(list: T[]): T[] {
  const isOutro = (name: string) => /^outr[oa]s?$/i.test(name.trim());
  return [...list].sort((a, b) => {
    const ao = isOutro(a.name);
    const bo = isOutro(b.name);
    if (ao !== bo) return ao ? 1 : -1;
    return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
  });
}
