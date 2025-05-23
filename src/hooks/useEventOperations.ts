import { useToast } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import { Event, EventForm } from '../types';

import { isRepeatingEvent } from '@/App';
import { generateRepeatEvents } from '@/utils/eventUtils';

export const useEventOperations = (editing: boolean, onSave?: () => void) => {
  const [events, setEvents] = useState<Event[]>([]);
  const toast = useToast();

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const { events } = await response.json();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: '이벤트 로딩 실패',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const updateEventWithRepeatChange = async (eventData: Event) => {
    try {
      // 반복 설정이 변경된 경우
      if (isRepeatingEvent(eventData)) {
        // 단일 일정에서 반복 일정으로 변경
        const repeatEvents = generateRepeatEvents(eventData);
        return await fetch('/api/events-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: repeatEvents }),
        });
      } else {
        // 반복 일정에서 단일 일정으로 변경
        return await fetch(`/api/events/${eventData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      }
    } catch (error) {
      console.error('Error updating event with repeat change:', error);
      throw error;
    }
  };

  const saveEvent = async (eventData: Event | EventForm) => {
    try {
      let response;
      if (editing) {
        // 기존 이벤트 정보를 상태에서 찾기
        const existingEvent = events.find((event) => event.id === (eventData as Event).id);
        if (!existingEvent) {
          throw new Error('수정할 이벤트가 없음.');
        }
        // 반복 설정이 변경된 경우
        if (isRepeatingEvent(eventData) !== isRepeatingEvent(existingEvent)) {
          response = await updateEventWithRepeatChange(eventData as Event);
        } else {
          response = await fetch(`/api/events/${(eventData as Event).id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
          });
          if (response && !response.ok) {
            throw new Error('Failed to update event');
          }
        }
      } else if (isRepeatingEvent(eventData)) {
        response = await fetch('/api/events-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: generateRepeatEvents(eventData),
          }),
        });
      } else {
        response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      }

      if (!response || !response.ok) {
        throw new Error('Failed to save event');
      }

      await fetchEvents();
      onSave?.();
      toast({
        title: editing ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: '일정 저장 실패',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      await fetchEvents();
      toast({
        title: '일정이 삭제되었습니다.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: '일정 삭제 실패',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  async function init() {
    await fetchEvents();
    toast({
      title: '일정 로딩 완료!',
      status: 'info',
      duration: 1000,
    });
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { events, fetchEvents, saveEvent, deleteEvent };
};
