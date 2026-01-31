import Breadcrumb from '../components/ui/Breadcrumbs/Breadcrumb';
import TableOne from '../components/ui/Tables/TableOne';
import TableThree from '../components/ui/Tables/TableThree';
import TableTwo from '../components/ui/Tables/TableTwo';

const Tables = () => {
  return (
    <>
      <Breadcrumb pageName="Tables" />

      <div className="flex flex-col gap-10">
        <TableOne />
        <TableTwo />
        <TableThree />
      </div>
    </>
  );
};

export default Tables;
