export const MENUS = [
    { id: 'work', name: '업무 일지' },
    { id: 'dev', name: '개발 노트' },
    { id: 'meeting', name: '회의/일정' },
    { id: 'issue', name: '이슈/버그' },
    { id: 'idea', name: '아이디어' }
];

export const getMenuName = (id: string) => {
    return MENUS.find(m => m.id === id)?.name || id;
};
