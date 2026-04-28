/**
 * Alias legacy — la abstracción real vive en `components/plugin-fields`.
 * Mantengo el nombre para no romper imports existentes.
 */
import { usePluginFields, type PluginFieldDef } from '../components/plugin-fields';

export type PluginLineFieldDef = PluginFieldDef;

export function usePluginLineFields(tableName: string | undefined): PluginFieldDef[] {
  return usePluginFields(tableName, { surface: 'form' });
}
