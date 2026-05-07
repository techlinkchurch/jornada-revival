# Plano: Controle de Desbloqueio por Horário

## Contexto

Atualmente qualquer usuário com o token correto consegue desbloquear qualquer turno, a qualquer hora e em qualquer ordem. A coluna `liberacao_at` existe na tabela `jornadas` mas é completamente ignorada. O RPC `unlock_via_qr` tem lógica de ordem sequencial mas não é chamado por ninguém.

---

## O que precisa ser feito

### 1. Configurar `liberacao_at` para cada turno

Popular a coluna `liberacao_at` com o horário real de início de cada turno. Exemplo:

```sql
UPDATE jornadas SET liberacao_at = '2026-05-09 19:30:00-03' WHERE dia_number = 1;
UPDATE jornadas SET liberacao_at = '2026-05-10 09:00:00-03' WHERE dia_number = 2;
UPDATE jornadas SET liberacao_at = '2026-05-10 14:00:00-03' WHERE dia_number = 3;
UPDATE jornadas SET liberacao_at = '2026-05-10 19:30:00-03' WHERE dia_number = 4;
```

> Ajustar os horários conforme a programação real do evento.

---

### 2. Enforçar `liberacao_at` na edge function `unlock-checkpoint`

Adicionar a checagem logo após validar o token, antes de qualquer outra lógica de pontos:

```typescript
// Buscar jornada com liberacao_at
const { data: jornada } = await supabase
  .from("jornadas")
  .select("id, qr_code_secret, liberacao_at")
  .eq("dia_number", day_number)
  .single();

// Checar horário — apenas para role = 'usuario'
if (profileData?.role === "usuario" && jornada.liberacao_at) {
  const now = new Date();
  const liberacao = new Date(jornada.liberacao_at);
  if (now < liberacao) {
    return new Response(JSON.stringify({
      error: "Este turno ainda não foi liberado.",
      success: false,
      liberacao_at: jornada.liberacao_at,
    }), { status: 403, headers: corsHeaders });
  }
}
```

Admins e pastores continuam podendo desbloquear a qualquer hora (modo preview).

---

### 3. Enforçar ordem sequencial na edge function

O RPC `unlock_via_qr` já tem essa lógica, mas não é usado. Replicar na edge function:

```typescript
// Apenas para role = 'usuario' e dia_number > 1
if (profileData?.role === "usuario" && day_number > 1) {
  const { data: anterior } = await supabase
    .from("progresso_usuario")
    .select("qr_code_escaneado")
    .eq("user_id", user.id)
    .eq("jornada_id", /* id do turno anterior */)
    .maybeSingle();

  if (!anterior?.qr_code_escaneado) {
    return new Response(JSON.stringify({
      error: `Desbloqueie o Turno ${day_number - 1} primeiro.`,
      success: false,
    }), { status: 403, headers: corsHeaders });
  }
}
```

Para buscar o `jornada_id` do turno anterior, adicionar `dia_number` na query da jornada atual e fazer um segundo select filtrando `dia_number = day_number - 1`.

---

### 4. Refletir o estado de "ainda não liberado" no frontend

**Dashboard:** mostrar os cards de turno como bloqueados com countdown ou mensagem de horário.

No `dashboard.tsx`, ao buscar as jornadas, incluir `liberacao_at` e passar para o `CheckpointCard`:

```typescript
// Lógica de status do card
const agora = new Date();
const liberado = !jornada.liberacao_at || new Date(jornada.liberacao_at) <= agora;

const status = !liberado
  ? "em_breve"          // turno existe mas horário ainda não chegou
  : !progresso
  ? "locked"            // horário ok mas usuário não desbloqueou
  : !progresso.qr_code_escaneado
  ? "live"              // pode desbloquear agora
  : !progresso.quiz_concluido
  ? "unlocked"          // desbloqueado, quiz pendente
  : "done";             // tudo feito
```

Adicionar um estado visual `"em_breve"` no `CheckpointCard` mostrando o horário de liberação.

---

### 5. Mensagem de erro amigável na página do turno

Quando a edge function retornar `liberacao_at` no erro, exibir o horário formatado:

```typescript
// Em handleUnlock no $dia/$slug.tsx
if (data?.liberacao_at) {
  const horario = new Date(data.liberacao_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  });
  toast.error(`Este turno abre às ${horario}. Aguarde!`);
  return;
}
```

---

## Ordem de execução sugerida

1. Configurar `liberacao_at` no banco (SQL)
2. Atualizar edge function `unlock-checkpoint` (backend — sem risco de regressão visual)
3. Atualizar dashboard para mostrar status `"em_breve"` (frontend)
4. Atualizar página do turno para mostrar erro amigável (frontend)

---

## O que NÃO mudar

- A lógica de admins/pastores em modo preview — continuam sem restrição de horário.
- O RPC `unlock_via_qr` — está obsoleto, pode ser removido depois ou mantido sem uso.
- A lógica de pontuação — zero impacto nessa área.
