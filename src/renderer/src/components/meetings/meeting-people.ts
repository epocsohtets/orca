import type { MeetingPerson } from './meeting-types'

export const SEOYEON = 'seoyeon'
export const JIHO = 'jiho'
export const MINA = 'mina'
export const DAEUN = 'daeun'
export const HYUNWOO = 'hyunwoo'

export const MEETING_PEOPLE: MeetingPerson[] = [
  { id: SEOYEON, name: '강서연', role: '마케팅 팀장' },
  { id: JIHO, name: '박지호', role: '콘텐츠 마케터' },
  { id: MINA, name: '이민아', role: '운영 매니저' },
  { id: DAEUN, name: '정다은', role: '고객지원 리드' },
  { id: HYUNWOO, name: '최현우', role: '디자이너' }
]

export const personName = (id: string): string =>
  MEETING_PEOPLE.find((person) => person.id === id)?.name ?? id
