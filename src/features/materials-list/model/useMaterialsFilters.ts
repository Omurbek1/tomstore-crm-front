import { useEffect, useState } from "react";

export const useMaterialsFilters = () => {
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [folderId, search, pageSize]);

  return {
    folderId,
    setFolderId,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    onPageChange: (nextPage: number, nextPageSize: number) => {
      setPage(nextPage);
      setPageSize(nextPageSize);
    },
  };
};

