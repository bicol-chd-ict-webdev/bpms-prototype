import { useEffect, useMemo, useState } from 'react';
import type { BloodComponentType, BloodUnit, FullBloodType, UnitStatus, UserRole } from '../types/blood';
import { isTestedUnit } from '../lib/inventory';

type FilterValue<T> = T | 'ALL';
type TestOutcomeFilter = 'ALL' | 'NON_REACTIVE' | 'REACTIVE';
type SortDirection = 'asc' | 'desc';

export function useInventoryTable(bloodUnits: BloodUnit[], role: UserRole, facilityId?: string) {
  const [selectedType, setSelectedType] = useState<FilterValue<FullBloodType>>('ALL');
  const [selectedComponent, setSelectedComponent] = useState<FilterValue<BloodComponentType>>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<FilterValue<UnitStatus>>('ALL');
  const [testOutcomeFilter, setTestOutcomeFilter] = useState<TestOutcomeFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => setCurrentPage(1), [selectedType, selectedComponent, selectedStatus, testOutcomeFilter, searchTerm]);

  const allTestedUnits = useMemo(
    () => bloodUnits.filter(unit =>
      isTestedUnit(unit)
      && unit.currentLocation.role === role
      && (!facilityId || unit.currentLocation.facilityId === facilityId)
    ),
    [bloodUnits, facilityId, role],
  );
  const nonReactiveUnits = useMemo(
    () => allTestedUnits.filter(unit => unit.testingStatus.overall === 'Passed'),
    [allTestedUnits],
  );
  const reactiveUnits = useMemo(
    () => allTestedUnits.filter(unit => unit.testingStatus.overall === 'Failed'),
    [allTestedUnits],
  );
  const filteredUnits = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return allTestedUnits.filter(unit => {
      const matchesOutcome = testOutcomeFilter === 'ALL'
        || (testOutcomeFilter === 'NON_REACTIVE' && unit.testingStatus.overall === 'Passed')
        || (testOutcomeFilter === 'REACTIVE' && unit.testingStatus.overall === 'Failed');
      const matchesSearch = !query || unit.id.toLowerCase().includes(query) || unit.donorId.toLowerCase().includes(query);

      return matchesOutcome
        && (selectedType === 'ALL' || unit.bloodType === selectedType)
        && (selectedComponent === 'ALL' || unit.component === selectedComponent)
        && (selectedStatus === 'ALL' || unit.status === selectedStatus)
        && matchesSearch;
    });
  }, [allTestedUnits, searchTerm, selectedComponent, selectedStatus, selectedType, testOutcomeFilter]);
  const sortedUnits = useMemo(() => {
    if (!sortColumn) return filteredUnits;

    const columns: Record<string, (unit: BloodUnit) => string | number> = {
      din: unit => unit.id,
      type: unit => unit.bloodType,
      component: unit => unit.component,
      volume: unit => unit.volumeMl,
      status: unit => unit.status,
    };
    const getValue = columns[sortColumn];
    if (!getValue) return filteredUnits;

    return [...filteredUnits].sort((left, right) => {
      const comparison = getValue(left) < getValue(right) ? -1 : getValue(left) > getValue(right) ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredUnits, sortColumn, sortDirection]);
  const totalPages = Math.max(1, Math.ceil(sortedUnits.length / rowsPerPage));
  const paginatedUnits = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * rowsPerPage;
    return sortedUnits.slice(start, start + rowsPerPage);
  }, [currentPage, rowsPerPage, sortedUnits, totalPages]);

  const handleSort = (column: string) => {
    setSortDirection(current => sortColumn === column ? (current === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortColumn(column);
    setCurrentPage(1);
  };
  const clearFilters = () => {
    setSelectedType('ALL');
    setSelectedComponent('ALL');
    setSelectedStatus('ALL');
    setTestOutcomeFilter('ALL');
    setSearchTerm('');
  };

  return {
    allTestedUnits, nonReactiveUnits, reactiveUnits, filteredUnits, sortedUnits, paginatedUnits, totalPages,
    selectedType, setSelectedType, selectedComponent, setSelectedComponent, selectedStatus, setSelectedStatus,
    testOutcomeFilter, setTestOutcomeFilter, searchTerm, setSearchTerm, currentPage, setCurrentPage,
    rowsPerPage, setRowsPerPage, sortColumn, sortDirection, handleSort, clearFilters,
  };
}
