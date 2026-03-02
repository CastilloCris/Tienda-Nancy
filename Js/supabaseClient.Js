window.sb = window.supabase.createClient(
  "https://bqkxxonbsezfesozeahy.supabase.co",
  "sb_publishable_OPjczO2zdR00Mc6dF7xRnQ_CBCyCtit"
);

async function cargarProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true);

  if (error) {
    console.error(error);
    return;
  }

  mostrarProductos(data);
}