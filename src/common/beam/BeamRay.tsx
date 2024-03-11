import * as React from 'react';

import type { SxProps } from '@mui/joy/styles/types';
import { Box, IconButton, styled, Typography } from '@mui/joy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';

import { ChatMessageMemo } from '../../apps/chat/components/message/ChatMessage';

import type { DLLMId } from '~/modules/llms/store-llms';

import { GoodTooltip } from '~/common/components/GoodTooltip';
import { useLLMSelect } from '~/common/components/forms/useLLMSelect';

import { BeamStoreApi, useBeamStore } from './store-beam';


// component configuration
const SHOW_DRAG_HANDLE = false;
const DEBUG_STATUS = false;


const rayCardClasses = {
  active: 'beamRay-Active',
} as const;

export const RayCard = styled(Box)(({ theme }) => ({
  '--Card-padding': '1rem',

  backgroundColor: theme.vars.palette.background.surface,
  border: '1px solid',
  borderColor: theme.vars.palette.neutral.outlinedBorder,
  borderRadius: theme.radius.md,

  padding: 'var(--Card-padding)',

  [`&.${rayCardClasses.active}`]: {
    boxShadow: 'inset 0 0 0 2px #00f, inset 0 0 0 4px #00a',
  },

  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--Pad_2)',

  // uncomment the following to limit the card height
  // maxHeight: 'calc(0.8 * (100dvh - 16rem))',
  // overflow: 'auto',
}));
RayCard.displayName = 'RayCard';


function rayCardStatusSx(status?: 'empty' | 'scattering' | 'success' | 'stopped' | 'error'): SxProps | null {
  switch (status) {
    // case 'success':
    //   return { backgroundColor: 'background.popup' };
    case 'error':
      return {
        backgroundColor: 'danger.softBg',
        borderColor: 'danger.outlinedBorder',
      };
    default:
      return null;
  }
}


function ControlsRow(props: {
  isEmpty: boolean;
  isLlmLinked: boolean;
  isScattering: boolean;
  llmComponent: React.ReactNode;
  onLink: () => void;
  onRemove: () => void;
  onToggleGenerate: () => void;
}) {
  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {SHOW_DRAG_HANDLE && (
      <IconButton disabled size='sm'>
        <DragIndicatorIcon />
      </IconButton>
    )}

    <Box sx={{ flex: 1 }}>
      {props.llmComponent}
    </Box>

    {!props.isLlmLinked && (
      <GoodTooltip title={props.isLlmLinked ? undefined : 'Link Model'}>
        <IconButton disabled={props.isLlmLinked || props.isScattering} size='sm' onClick={props.onLink}>
          {props.isLlmLinked ? <LinkIcon /> : <LinkOffIcon />}
        </IconButton>
      </GoodTooltip>
    )}

    {!props.isScattering ? (
      <GoodTooltip title='Generate'>
        <IconButton size='sm' variant='plain' color='success' onClick={props.onToggleGenerate}>
          {props.isEmpty ? <PlayArrowRoundedIcon /> : <ReplayRoundedIcon />}
        </IconButton>
      </GoodTooltip>
    ) : (
      <GoodTooltip title='Stop'>
        <IconButton size='sm' variant='plain' color='danger' onClick={props.onToggleGenerate}>
          <StopRoundedIcon />
        </IconButton>
      </GoodTooltip>
    )}

    <GoodTooltip title='Remove'>
      <IconButton size='sm' variant='plain' color='neutral' onClick={props.onRemove}>
        <RemoveCircleOutlineRoundedIcon />
      </IconButton>
    </GoodTooltip>
  </Box>;
}


const chatMessageEmbeddedSx: SxProps = {
  // style: to undo the style of ChatMessage
  backgroundColor: 'none',
  border: 'none',
  mx: -1.5, // compensates for the marging (e.g. RenderChatText, )
  my: 0,
  px: 0,
  py: 0,
} as const;


export function BeamRay(props: {
  beamStore: BeamStoreApi,
  rayId: string
  isMobile: boolean,
  gatherLlmId: DLLMId | null,
}) {

  // external state
  const ray = useBeamStore(props.beamStore, (store) => store.rays.find(ray => ray.rayId === props.rayId) ?? null);

  // derived state
  const isEmpty = !ray?.message?.updated;
  const isScattering = !!ray?.genAbortController;
  const { removeRay, updateRay, toggleScattering } = props.beamStore.getState();

  const isLlmLinked = !!props.gatherLlmId && !ray?.scatterLlmId;
  const llmId: DLLMId | null = isLlmLinked ? props.gatherLlmId : ray?.scatterLlmId || null;
  const setLlmId = React.useCallback((llmId: DLLMId | null) => {
    updateRay(props.rayId, { scatterLlmId: llmId });
  }, [props.rayId, updateRay]);
  const handleLlmLink = React.useCallback(() => setLlmId(null), [setLlmId]);
  const [_, llmComponent] = useLLMSelect(llmId, setLlmId, '', true, isScattering);


  // handlers

  const handleRayToggleGenerate = React.useCallback(() => {
    toggleScattering(props.rayId);
  }, [props.rayId, toggleScattering]);

  const handleRayRemove = React.useCallback(() => {
    removeRay(props.rayId);
  }, [props.rayId, removeRay]);


  return (
    <RayCard sx={rayCardStatusSx(ray?.status)}>

      {DEBUG_STATUS && (
        <Typography level='body-sm'>
          {ray?.status}
        </Typography>
      )}

      {/* Controls Row */}
      <ControlsRow
        isEmpty={isEmpty}
        isLlmLinked={isLlmLinked}
        isScattering={isScattering}
        llmComponent={llmComponent}
        onLink={handleLlmLink}
        onRemove={handleRayRemove}
        onToggleGenerate={handleRayToggleGenerate}
      />

      {/* Ray Message */}
      {(!!ray?.message && !isEmpty) && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          // uncomment the following to limit the message height
          // overflow: 'auto',
          // maxHeight: 'calc(0.8 * (100vh - 16rem))',
          // aspectRatio: 1,
        }}>
          <ChatMessageMemo
            message={ray.message}
            fitScreen={props.isMobile}
            showAvatar={false}
            adjustContentScaling={-1}
            sx={chatMessageEmbeddedSx}
          />
        </Box>
      )}

    </RayCard>
  );
}