-- Consultas educativas minimizadas y reportes privados del educador.

create table if not exists public.informes_educativos (
  id uuid primary key default gen_random_uuid(),
  educador_id uuid not null references public.perfiles(id),
  colegio_id uuid not null references public.colegios(id),
  estudiante_id uuid references public.perfiles(id),
  curso text,
  periodo text not null check (length(periodo) between 1 and 40),
  datos_observados jsonb not null,
  recomendaciones_ia jsonb not null,
  creado_en timestamptz not null default now()
);

create index if not exists informes_educativos_owner_idx
  on public.informes_educativos (educador_id, creado_en desc);

alter table public.informes_educativos enable row level security;
create policy "informes: educador lee sus informes del propio colegio"
  on public.informes_educativos for select
  using (
    educador_id = auth.uid()
    and exists (
      select 1 from public.perfiles educador
      where educador.id = auth.uid()
        and educador.rol = 'educador'
        and educador.colegio_id = informes_educativos.colegio_id
    )
  );
create policy "informes: educador crea sus informes del propio colegio"
  on public.informes_educativos for insert
  with check (
    educador_id = auth.uid()
    and exists (
      select 1 from public.perfiles educador
      where educador.id = auth.uid()
        and educador.rol = 'educador'
        and educador.colegio_id = informes_educativos.colegio_id
    )
    and (
      estudiante_id is null
      or exists (
        select 1 from public.perfiles estudiante
        where estudiante.id = informes_educativos.estudiante_id
          and estudiante.rol = 'estudiante'
          and estudiante.colegio_id = informes_educativos.colegio_id
          and estudiante.consentimiento_acudiente = 'aprobado'
      )
    )
  );
revoke update, delete on public.informes_educativos from authenticated;

create or replace function public.obtener_estudiantes_educador()
returns table (
  estudiante_id uuid,
  nombre text,
  curso text,
  nivel integer,
  xp integer,
  retos_completados integer,
  total_retos integer,
  progreso_promedio integer,
  progreso_modulos jsonb,
  actividad_reciente jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colegio_id uuid;
begin
  select perfiles.colegio_id into v_colegio_id
  from public.perfiles
  where perfiles.id = auth.uid() and perfiles.rol = 'educador';
  if not found or v_colegio_id is null then
    raise exception 'Acceso educativo no autorizado.';
  end if;

  return query
  select
    estudiante.id,
    estudiante.nombre,
    estudiante.curso,
    coalesce(personaje.nivel, 1),
    coalesce(personaje.xp, 0),
    estadisticas.retos_completados,
    estadisticas.total_retos,
    estadisticas.progreso_promedio,
    estadisticas.progreso_modulos,
    recientes.actividad_reciente
  from public.perfiles estudiante
  left join public.personajes personaje on personaje.usuario_id = estudiante.id
  cross join lateral (
    select
      coalesce(sum(modulo.total), 0)::integer as total_retos,
      coalesce(sum(modulo.completados), 0)::integer as retos_completados,
      coalesce(round(avg(case when modulo.total = 0 then 0 else 100.0 * modulo.completados / modulo.total end)), 0)::integer as progreso_promedio,
      coalesce(jsonb_agg(modulo.resumen order by modulo.orden), '[]'::jsonb) as progreso_modulos
    from (
      select
        m.orden,
        count(r.id)::integer as total,
        count(r.id) filter (where p.estado = 'completado')::integer as completados,
        jsonb_build_object(
          'slug', m.slug,
          'nombre', m.nombre,
          'total', count(r.id)::integer,
          'completados', count(r.id) filter (where p.estado = 'completado')::integer,
          'porcentaje', case
            when count(r.id) = 0 then 0
            else round(100.0 * count(r.id) filter (where p.estado = 'completado') / count(r.id))::integer
          end
        ) as resumen
      from public.modulos m
      left join public.retos r on r.modulo_id = m.id
      left join public.progreso_usuario_reto p
        on p.reto_id = r.id and p.usuario_id = estudiante.id
      where m.estado = 'mvp'
      group by m.id
    ) modulo
  ) estadisticas
  cross join lateral (
    select coalesce(jsonb_agg(to_jsonb(actividad) order by actividad.actualizado_en desc), '[]'::jsonb) as actividad_reciente
    from (
      select r.nombre as reto, p.puntaje, p.actualizado_en
      from public.progreso_usuario_reto p
      join public.retos r on r.id = p.reto_id
      where p.usuario_id = estudiante.id and p.estado = 'completado'
      order by p.actualizado_en desc
      limit 5
    ) actividad
  ) recientes
  where estudiante.colegio_id = v_colegio_id
    and estudiante.rol = 'estudiante'
    and estudiante.consentimiento_acudiente = 'aprobado'
  order by estudiante.curso nulls last, estudiante.nombre;
end;
$$;

create or replace function public.obtener_estudiante_educador(p_estudiante_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estudiante jsonb;
begin
  select to_jsonb(estudiante) into v_estudiante
  from public.obtener_estudiantes_educador() estudiante
  where estudiante.estudiante_id = p_estudiante_id;
  return v_estudiante;
end;
$$;

revoke all on function public.obtener_estudiantes_educador() from public;
grant execute on function public.obtener_estudiantes_educador() to authenticated;
revoke all on function public.obtener_estudiante_educador(uuid) from public;
grant execute on function public.obtener_estudiante_educador(uuid) to authenticated;